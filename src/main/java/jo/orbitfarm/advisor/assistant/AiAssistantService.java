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
import jo.orbitfarm.advisor.subscription.SubscriptionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
    private static final Logger log = LoggerFactory.getLogger(AiAssistantService.class);
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
    private final SubscriptionService subscriptions;

    public AiAssistantService(@Value("${advisor.ai.api-key:}") String apiKey,
                              @Value("${advisor.ai.model:gemini-3.5-flash-lite}") String model,
                              @Value("${advisor.ai.base-url:https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent}") String baseUrl,
                              ObjectMapper mapper, FarmService farms, DecisionService decisions,
                              PackCatalog packs, SalinityService salinity,SubscriptionService subscriptions) {
        this.apiKey = apiKey == null ? "" : apiKey.trim(); this.model = model; this.baseUrl = baseUrl;
        this.mapper = mapper; this.farms = farms; this.decisions = decisions; this.packs = packs; this.salinity = salinity;this.subscriptions=subscriptions;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public ChatResponse chat(Long farmerId,AssistantController.ChatRequest request) {
        if(!subscriptions.effectivePlan(farmerId).aiAssistant())throw new ApiException(HttpStatus.FORBIDDEN,"PLAN_FEATURE_REQUIRED","مساعد الذكاء الاصطناعي متاح ضمن الخطط المدفوعة.");
        requireConfigured();
        ObjectNode context = buildContext(request.farmId(),farmerId);
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

    public OrganizedData organize(Long farmerId,AssistantController.OrganizeRequest request) {
        if(!subscriptions.effectivePlan(farmerId).aiAssistant())throw new ApiException(HttpStatus.FORBIDDEN,"PLAN_FEATURE_REQUIRED","مساعد الذكاء الاصطناعي متاح ضمن الخطط المدفوعة.");
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
        if (request.farmId() != null) data.set("existingFarm", mapper.valueToTree(farms.get(request.farmId(),farmerId)));
        JsonNode schema = schema("""
                {"type":"object","properties":{"farmName":{"type":["string","null"]},"latitude":{"type":["number","null"]},"longitude":{"type":["number","null"]},"areaDunum":{"type":["number","null"]},"irrigation":{"type":["string","null"],"enum":["NONE","LIMITED","FULL",null]},"measuredSalinityDsm":{"type":["number","null"]},"salinityClassOverride":{"type":["string","null"],"enum":["NON_SALINE","SLIGHTLY_SALINE","MODERATELY_SALINE","HIGHLY_SALINE","EXTREMELY_SALINE",null]},"previousCropCode":{"type":["string","null"]},"requestedCropCodes":{"type":"array","items":{"type":"string"}},"unmappedCropNames":{"type":"array","items":{"type":"string"}},"missingFields":{"type":"array","items":{"type":"string"}},"notes":{"type":"array","items":{"type":"string"}}},"required":["farmName","latitude","longitude","areaDunum","irrigation","measuredSalinityDsm","salinityClassOverride","previousCropCode","requestedCropCodes","unmappedCropNames","missingFields","notes"],"additionalProperties":false}
                """);
        ArrayNode input = mapper.createArrayNode();
        input.add(message("system", "حوّل وصف المزرعة العربي أو الإنجليزي إلى الحقول المحددة فقط. استخرج القيم التي ذكرها المستخدم صراحة؛ لا تخمّن الإحداثيات أو المساحة أو القياسات أو نوع الري. مساحة الأرض areaDunum بالدونم الأردني؛ لا تحوّل من وحدة ثانية إلا إذا ذكر المستخدم الوحدة ويمكن تحويلها بوضوح. salinity dS/m لا تُملأ إلا إذا ذكر المستخدم رقم قياس مخبري ووحدته بوضوح. صنّف وصف الملوحة النصي في salinityClassOverride فقط ولا تحوّله إلى رقم. طابق المحصول مع cropCatalog وأعد code معروفًا فقط؛ ضع الاسم غير الموجود في unmappedCropNames. إذا كانت قيمة غير معروفة اتركها null وأضف اسمها إلى missingFields. لا تحفظ أي تغيير؛ الناتج مسودة للمستخدم ليؤكدها."));
        input.add(message("user", "DATA_AND_CATALOG_JSON:\n" + write(data)));
        JsonNode result = call("organize_farm_data", schema, input);
        BigDecimal lat = decimalOrNull(result.get("latitude"));
        BigDecimal lon = decimalOrNull(result.get("longitude"));
        if (lat != null && (lat.compareTo(BigDecimal.valueOf(-90)) < 0 || lat.compareTo(BigDecimal.valueOf(90)) > 0)) lat = null;
        if (lon != null && (lon.compareTo(BigDecimal.valueOf(-180)) < 0 || lon.compareTo(BigDecimal.valueOf(180)) > 0)) lon = null;
        BigDecimal area = decimalOrNull(result.get("areaDunum"));
        if (area != null && (area.compareTo(new BigDecimal("0.01")) < 0 || area.compareTo(new BigDecimal("100000")) > 0)) area = null;
        if (area == null && request.farmId() != null) area = farms.get(request.farmId(),farmerId).areaDunum();
        String irrigation = upperOrNull(result.path("irrigation").asText(null));
        if (irrigation == null || !IRRIGATION_VALUES.contains(irrigation)) irrigation = null;
        BigDecimal measured = decimalOrNull(result.get("measuredSalinityDsm"));
        if (measured != null && (measured.signum() < 0 || measured.compareTo(BigDecimal.valueOf(100)) > 0
                || !MEASURED_SALINITY.matcher(request.text()).find())) measured = null;
        SalinityClass override = null;
        String classText = upperOrNull(result.path("salinityClassOverride").asText(null));
        if (classText != null && SALINITY_VALUES.contains(classText)) override = SalinityClass.valueOf(classText);
        if (result.path("salinityClassOverride").isNull() && request.farmId() != null) {
            FarmResponse farm = farms.get(request.farmId(),farmerId);
            override = farm.salinityClassOverride();
        }
        List<String> knownCodes = cropList.stream().map(CropPack.Crop::code).map(x -> x.toUpperCase(Locale.ROOT)).toList();
        List<String> requestedCodes = strings(result.path("requestedCropCodes")).stream().map(x -> x.toUpperCase(Locale.ROOT)).filter(knownCodes::contains).distinct().toList();
        List<String> unmapped = new ArrayList<>(strings(result.path("unmappedCropNames")));
        for (String code : strings(result.path("requestedCropCodes"))) if (!knownCodes.contains(code.toUpperCase(Locale.ROOT))) unmapped.add(code);
        List<String> missing = new ArrayList<>(strings(result.path("missingFields")));
        if (lat == null) addIfMissing(missing, "latitude");
        if (lon == null) addIfMissing(missing, "longitude");
        if (area == null) addIfMissing(missing, "areaDunum");
        if (irrigation == null) addIfMissing(missing, "irrigation");
        if (measured == null && override == null) addIfMissing(missing, "soilSalinity");
        return new OrganizedData(result.path("farmName").isNull() ? null : result.path("farmName").asText(null),
                lat, lon, area, irrigation, measured, override,
                result.path("previousCropCode").isNull() ? null : result.path("previousCropCode").asText(null),
                requestedCodes, unmapped.stream().distinct().toList(), missing.stream().distinct().toList(),
                strings(result.path("notes")), true,
                "لم يتم حفظ المسودة. راجع الحقول وأكدها قبل إرسالها إلى API المزرعة.");
    }

    private ObjectNode buildContext(Long farmId,Long farmerId) {
        ObjectNode context = mapper.createObjectNode();
        ArrayNode packArray = context.putArray("packs");
        packs.active().forEach(pack -> {
            ObjectNode p = packArray.addObject(); p.put("code", pack.code()); p.put("scope", pack.scope()); p.put("demo", pack.demo());
            p.set("crops", mapper.valueToTree(pack.crops())); p.set("regions", mapper.valueToTree(pack.regions()));
        });
        if (farmId != null) {
            FarmResponse farm = farms.get(farmId,farmerId);
            context.set("farm", mapper.valueToTree(farm));
            context.set("salinityAssessment", mapper.valueToTree(salinity.assess(farm.latitude(), farm.longitude(), farm.salinityDsm(), farm.salinityClassOverride())));
            List<AdviceResponse> latest = decisions.list(farmId,farmerId,0,1).getContent();
            if (!latest.isEmpty()) context.set("latestDecision", mapper.valueToTree(latest.get(0)));
        }
        return context;
    }

    private JsonNode call(String schemaName, JsonNode schema, ArrayNode input) {
        ObjectNode requestBody = mapper.createObjectNode();
        ObjectNode systemInstruction = requestBody.putObject("systemInstruction");
        ArrayNode systemParts = systemInstruction.putArray("parts");
        ArrayNode contents = requestBody.putArray("contents");
        for (JsonNode item : input) {
            String role = item.path("role").asText("user");
            String content = item.path("content").asText("");
            if ("system".equals(role)) {
                systemParts.addObject().put("text", content);
            } else {
                ObjectNode message = contents.addObject();
                message.put("role", "assistant".equals(role) ? "model" : "user");
                message.putArray("parts").addObject().put("text", content);
            }
        }
        ObjectNode generation = requestBody.putObject("generationConfig");
        generation.put("maxOutputTokens", 1200);
        generation.put("responseMimeType", "application/json");
        generation.set("responseJsonSchema", schema);
        try {
            String endpoint = baseUrl.replace("{model}", model);
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(35))
                    .header("x-goog-api-key", apiKey).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(requestBody))).build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) throw providerError("AI provider returned HTTP " + response.statusCode());
            JsonNode body = mapper.readTree(response.body());
            String text = extractGeminiText(body);
            if (text.isBlank()) throw providerError("AI provider did not return structured output");
            return mapper.readTree(text);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw providerError("AI request was interrupted");
        } catch (IOException e) {
            log.warn("Gemini request I/O failed: {}", e.toString());
            throw providerError("Could not reach or parse the AI provider response");
        } catch (IllegalArgumentException e) {
            log.warn("Gemini request or response parsing failed: {}", e.toString());
            throw providerError("Could not reach or parse the AI provider response");
        }
    }

    private String extractGeminiText(JsonNode body) {
        StringBuilder text = new StringBuilder();
        for (JsonNode candidate : body.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                if (part.hasNonNull("text")) text.append(part.path("text").asText());
            }
            if (!text.isEmpty()) break;
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
    private void requireConfigured() { if (apiKey.isBlank()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED", "Set GEMINI_API_KEY to enable the AI assistant"); }
    private ApiException providerError(String message) { return new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_UNAVAILABLE", message); }

    public record ChatResponse(String reply, List<String> followUpQuestions, List<String> dataUsed, String dataWarning) {}
    public record OrganizedData(String farmName, BigDecimal latitude, BigDecimal longitude, BigDecimal areaDunum, String irrigation,
                                BigDecimal measuredSalinityDsm, SalinityClass salinityClassOverride,
                                String previousCropCode, List<String> requestedCropCodes, List<String> unmappedCropNames,
                                List<String> missingFields, List<String> notes, boolean requiresUserConfirmation,
                                String message) {}
}
