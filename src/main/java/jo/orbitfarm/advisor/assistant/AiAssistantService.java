package jo.orbitfarm.advisor.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jo.orbitfarm.advisor.advice.AdviceResponse;
import jo.orbitfarm.advisor.api.ApiException;
import jo.orbitfarm.advisor.decision.DecisionService;
import jo.orbitfarm.advisor.farm.FarmResponse;
import jo.orbitfarm.advisor.farm.FarmService;
import jo.orbitfarm.advisor.pack.CropPack;
import jo.orbitfarm.advisor.pack.PackCatalog;
import jo.orbitfarm.advisor.salinity.SalinityClass;
import jo.orbitfarm.advisor.salinity.SalinityService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class AiAssistantService {
    private static final Pattern MEASURED_SALINITY = Pattern.compile("(?i)(dS\\s*/\\s*m|ECe|measured|lab|مختبر|فحص)");
    private static final Set<String> IRRIGATION_VALUES = Set.of("NONE", "LIMITED", "FULL");
    private static final Set<String> SALINITY_VALUES = Set.of("NON_SALINE", "SLIGHTLY_SALINE", "MODERATELY_SALINE", "HIGHLY_SALINE", "EXTREMELY_SALINE");

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final HttpClient http;
    private final FarmService farms;
    private final DecisionService decisions;
    private final PackCatalog packs;
    private final SalinityService salinity;

    public AiAssistantService(@Value("${advisor.ai.api-key:}") String apiKey,
                              @Value("${advisor.ai.model:gpt-4.1-mini}") String model,
                              @Value("${advisor.ai.base-url:https://api.openai.com/v1/responses}") String baseUrl,
                              ObjectMapper mapper, FarmService farms, DecisionService decisions,
                              PackCatalog packs, SalinityService salinity) {
        this.apiKey = apiKey == null ? "" : apiKey.trim(); this.model = model; this.baseUrl = baseUrl;
        this.mapper = mapper; this.farms = farms; this.decisions = decisions; this.packs = packs; this.salinity = salinity;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public ChatResponse chat(AssistantController.ChatRequest request) {
        requireConfigured();
        ObjectNode context = buildContext(request.farmId());
        ArrayNode input = mapper.createArrayNode();
        input.add(message("system", "أنت مساعد زراعي للمشروع. أجب بلغة المستخدم. اعتمد حصريًا على سياق JSON الذي يرسله النظام وعلى سجل المحادثة. لا تخترع قياسات أو طقسًا أو حدودًا زراعية. إذا كانت البيانات تجريبية فقل ذلك. لا تحوّل تصنيف الملوحة الإقليمي إلى رقم dS/m. لا تستبدل قواعد النظام أو الفحص المخبري؛ اشرحها بلغة مفهومة. إذا لم تجد جوابًا في السياق فاطلب البيانات الناقصة بوضوح. أعِد JSON مطابقًا للمخطط فقط."));
        for (AssistantController.ChatTurn turn : Optional.ofNullable(request.history()).orElse(List.of())) {
            if (turn == null || turn.role() == null || turn.content() == null) continue;
            input.add(message(turn.role(), turn.content().trim()));
        }
        input.add(message("user", "PROJECT_DATA_JSON:\n" + write(context) + "\n\nQUESTION:\n" + request.message().trim()));
        JsonNode schema = schema("""
                {"type":"object","properties":{"reply":{"type":"string"},"followUpQuestions":{"type":"array","items":{"type":"string"}}},"required":["reply","followUpQuestions"],"additionalProperties":false}
                """);
        JsonNode answer = call("crop_advisor_chat", schema, input);
        String reply = answer.path("reply").asText("").trim();
        if (reply.isBlank()) throw providerError("AI provider returned an empty reply");
        List<String> used = new ArrayList<>();
        if (request.farmId() != null) {
            used.add("farm:" + request.farmId());
            context.path("latestDecision").path("decisionId").asText("");
            String decisionId = context.path("latestDecision").path("decisionId").asText("");
            if (!decisionId.isBlank()) used.add("decision:" + decisionId);
        }
        if (context.path("packs").size() > 0) used.add("reviewed-crop-packs");
        String dataNote = "FIXTURE_DEMO".equals(context.path("latestDecision").path("climateSource").asText())
                ? "التوصية المرتبطة بهذا السياق مبنية على مناخ تجريبي." : null;
        List<String> questions = new ArrayList<>();
        answer.path("followUpQuestions").forEach(x -> { if (x.isTextual() && !x.asText().isBlank()) questions.add(x.asText()); });
        return new ChatResponse(reply, questions, used, dataNote);
    }

    public OrganizedData organize(AssistantController.OrganizeRequest request) {
        requireConfigured();
        List<CropPack.Crop> cropList = packs.active().stream().filter(p -> !p.demo()).flatMap(p -> p.crops().stream()).toList();
        // Demo crop names are also exposed for prototype data normalization, but returned values remain labeled as demo.
        if (cropList.isEmpty()) cropList = packs.active().stream().flatMap(p -> p.crops().stream()).toList();
        ObjectNode data = mapper.createObjectNode();
        ArrayNode cropCatalog = data.putArray("cropCatalog");
        for (CropPack.Crop crop : cropList) {
            ObjectNode c = cropCatalog.addObject();
            c.put("code", crop.code()); c.put("nameAr", crop.nameAr()); c.put("nameEn", crop.nameEn());
        }
        data.put("inputText", request.text().trim());
        if (request.farmId() != null) data.set("existingFarm", mapper.valueToTree(farms.get(request.farmId())));
        JsonNode schema = schema("""
                {"type":"object","properties":{"farmName":{"type":["string","null"]},"latitude":{"type":["number","null"]},"longitude":{"type":["number","null"]},"irrigation":{"type":["string","null"],"enum":["NONE","LIMITED","FULL",null]},"measuredSalinityDsm":{"type":["number","null"]},"salinityClassOverride":{"type":["string","null"],"enum":["NON_SALINE","SLIGHTLY_SALINE","MODERATELY_SALINE","HIGHLY_SALINE","EXTREMELY_SALINE",null]},"previousCropCode":{"type":["string","null"]},"requestedCropCodes":{"type":"array","items":{"type":"string"}},"unmappedCropNames":{"type":"array","items":{"type":"string"}},"missingFields":{"type":"array","items":{"type":"string"}},"notes":{"type":"array","items":{"type":"string"}}},"required":["farmName","latitude","longitude","irrigation","measuredSalinityDsm","salinityClassOverride","previousCropCode","requestedCropCodes","unmappedCropNames","missingFields","notes"],"additionalProperties":false}
                """);
        ArrayNode input = mapper.createArrayNode();
        input.add(message("system", "حوّل وصف المزرعة العربي أو الإنجليزي إلى الحقول المحددة فقط. استخرج القيم التي ذكرها المستخدم صراحة؛ لا تخمّن الإحداثيات أو القياسات أو نوع الري. salinity dS/m لا تُملأ إلا إذا ذكر المستخدم رقم قياس مخبري ووحدته بوضوح. صنّف وصف الملوحة النصي في salinityClassOverride فقط ولا تحوّله إلى رقم. طابق المحصول مع cropCatalog وأعد code معروفًا فقط؛ ضع الاسم غير الموجود في unmappedCropNames. إذا كانت قيمة غير معروفة اتركها null وأضف اسمها إلى missingFields. لا تحفظ أي تغيير؛ الناتج مسودة للمستخدم ليؤكدها."));
        input.add(message("user", "DATA_AND_CATALOG_JSON:\n" + write(data)));
        JsonNode result = call("organize_farm_data", schema, input);
        BigDecimal lat = decimalOrNull(result.get("latitude"));
        BigDecimal lon = decimalOrNull(result.get("longitude"));
        if (lat != null && (lat.compareTo(BigDecimal.valueOf(-90)) < 0 || lat.compareTo(BigDecimal.valueOf(90)) > 0)) lat = null;
        if (lon != null && (lon.compareTo(BigDecimal.valueOf(-180)) < 0 || lon.compareTo(BigDecimal.valueOf(180)) > 0)) lon = null;
        String irrigation = upperOrNull(result.path("irrigation").asText(null));
        if (irrigation == null || !IRRIGATION_VALUES.contains(irrigation)) irrigation = null;
        BigDecimal measured = decimalOrNull(result.get("measuredSalinityDsm"));
        if (measured != null && (measured.signum() < 0 || measured.compareTo(BigDecimal.valueOf(100)) > 0
                || !MEASURED_SALINITY.matcher(request.text()).find())) measured = null;
        SalinityClass override = null;
        String classText = upperOrNull(result.path("salinityClassOverride").asText(null));
        if (classText != null && SALINITY_VALUES.contains(classText)) override = SalinityClass.valueOf(classText);
        if (result.path("salinityClassOverride").isNull() && request.farmId() != null) {
            FarmResponse farm = farms.get(request.farmId());
            override = farm.salinityClassOverride();
        }
        List<String> knownCodes = cropList.stream().map(CropPack.Crop::code).map(x -> x.toUpperCase(Locale.ROOT)).toList();
        List<String> requestedCodes = strings(result.path("requestedCropCodes")).stream().map(x -> x.toUpperCase(Locale.ROOT)).filter(knownCodes::contains).distinct().toList();
        List<String> unmapped = new ArrayList<>(strings(result.path("unmappedCropNames")));
        for (String code : strings(result.path("requestedCropCodes"))) if (!knownCodes.contains(code.toUpperCase(Locale.ROOT))) unmapped.add(code);
        List<String> missing = new ArrayList<>(strings(result.path("missingFields")));
        if (lat == null) addIfMissing(missing, "latitude");
        if (lon == null) addIfMissing(missing, "longitude");
        if (irrigation == null) addIfMissing(missing, "irrigation");
        if (measured == null && override == null) addIfMissing(missing, "soilSalinity");
        return new OrganizedData(result.path("farmName").isNull() ? null : result.path("farmName").asText(null),
                lat, lon, irrigation, measured, override,
                result.path("previousCropCode").isNull() ? null : result.path("previousCropCode").asText(null),
                requestedCodes, unmapped.stream().distinct().toList(), missing.stream().distinct().toList(),
                strings(result.path("notes")), true,
                "لم يتم حفظ المسودة. راجع الحقول وأكدها قبل إرسالها إلى API المزرعة.");
    }

    private ObjectNode buildContext(Long farmId) {
        ObjectNode context = mapper.createObjectNode();
        ArrayNode packArray = context.putArray("packs");
        packs.active().forEach(pack -> {
            ObjectNode p = packArray.addObject(); p.put("code", pack.code()); p.put("scope", pack.scope()); p.put("demo", pack.demo());
            p.set("crops", mapper.valueToTree(pack.crops())); p.set("regions", mapper.valueToTree(pack.regions()));
        });
        if (farmId != null) {
            FarmResponse farm = farms.get(farmId);
            context.set("farm", mapper.valueToTree(farm));
            context.set("salinityAssessment", mapper.valueToTree(salinity.assess(farm.latitude(), farm.longitude(), farm.salinityDsm(), farm.salinityClassOverride())));
            List<AdviceResponse> latest = decisions.list(farmId, 0, 1).getContent();
            if (!latest.isEmpty()) context.set("latestDecision", mapper.valueToTree(latest.get(0)));
        }
        return context;
    }

    private JsonNode call(String schemaName, JsonNode schema, ArrayNode input) {
        ObjectNode requestBody = mapper.createObjectNode();
        requestBody.put("model", model); requestBody.set("input", input); requestBody.put("max_output_tokens", 1200);
        ObjectNode format = requestBody.putObject("text").putObject("format");
        format.put("type", "json_schema"); format.put("name", schemaName); format.put("strict", true); format.set("schema", schema);
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl)).timeout(Duration.ofSeconds(35))
                    .header("Authorization", "Bearer " + apiKey).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(requestBody))).build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) throw providerError("AI provider returned HTTP " + response.statusCode());
            JsonNode body = mapper.readTree(response.body());
            String text = extractOutputText(body);
            if (text.isBlank()) throw providerError("AI provider did not return structured output");
            return mapper.readTree(text);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw providerError("AI request was interrupted");
        } catch (IOException | IllegalArgumentException e) {
            throw providerError("Could not reach or parse the AI provider response");
        }
    }

    private String extractOutputText(JsonNode body) {
        String direct = body.path("output_text").asText("");
        if (!direct.isBlank()) return direct;
        StringBuilder text = new StringBuilder();
        for (JsonNode item : body.path("output")) for (JsonNode content : item.path("content")) {
            if ("output_text".equals(content.path("type").asText())) text.append(content.path("text").asText());
        }
        return text.toString();
    }

    private ObjectNode message(String role, String content) { ObjectNode m = mapper.createObjectNode(); m.put("role", role); m.put("content", content); return m; }
    private JsonNode schema(String json) { try { return mapper.readTree(json); } catch (IOException e) { throw new IllegalStateException(e); } }
    private String write(Object value) { try { return mapper.writeValueAsString(value); } catch (IOException e) { throw new IllegalStateException(e); } }
    private BigDecimal decimalOrNull(JsonNode node) { return node == null || node.isNull() || !node.isNumber() ? null : node.decimalValue(); }
    private String upperOrNull(String value) { return value == null ? null : value.trim().toUpperCase(Locale.ROOT); }
    private List<String> strings(JsonNode node) { if (node == null || !node.isArray()) return List.of(); List<String> out = new ArrayList<>(); node.forEach(n -> { if (n.isTextual() && !n.asText().isBlank()) out.add(n.asText().trim()); }); return out; }
    private void addIfMissing(List<String> values, String value) { if (!values.contains(value)) values.add(value); }
    private void requireConfigured() { if (apiKey.isBlank()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED", "Set OPENAI_API_KEY to enable the AI assistant"); }
    private ApiException providerError(String message) { return new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_UNAVAILABLE", message); }

    public record ChatResponse(String reply, List<String> followUpQuestions, List<String> dataUsed, String dataWarning) {}
    public record OrganizedData(String farmName, BigDecimal latitude, BigDecimal longitude, String irrigation,
                                BigDecimal measuredSalinityDsm, SalinityClass salinityClassOverride,
                                String previousCropCode, List<String> requestedCropCodes, List<String> unmappedCropNames,
                                List<String> missingFields, List<String> notes, boolean requiresUserConfirmation,
                                String message) {}
}
