package jo.orbitfarm.advisor;

import jo.orbitfarm.advisor.salinity.SalinityClass;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:advisor-test;DB_CLOSE_DELAY=-1",
        "advisor.ai.api-key="
})
@AutoConfigureMockMvc
class BackendIntegrationTest {
    @Autowired MockMvc mvc;

    @Test
    void salinityEndpointReturnsRegionalCategoryWithoutFabricatingDsm() throws Exception {
        mvc.perform(get("/api/v1/reference/salinity").param("lat", "31.95").param("lon", "35.91"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classification", is(not(SalinityClass.NO_DATA.name()))))
                .andExpect(jsonPath("$.source", is("UNDP_GEOHUB_2016")))
                .andExpect(jsonPath("$.measuredDsm").doesNotExist());
    }

    @Test
    void farmAdviceIncludesSalinitySourceAndRuleMetadata() throws Exception {
        String response = mvc.perform(post("/api/v1/farms").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test farm\",\"latitude\":31.95,\"longitude\":35.91,\"irrigation\":\"LIMITED\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long farmId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response).path("id").asLong();
        mvc.perform(post("/api/v1/farms/{id}/advice", farmId).param("lang", "ar"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.coverageLevel", is(2)))
                .andExpect(jsonPath("$.ranked", is(true)))
                .andExpect(jsonPath("$.salinityAssessment.source", is("UNDP_GEOHUB_2016")))
                .andExpect(jsonPath("$.climateSource", is("FIXTURE_DEMO")))
                .andExpect(jsonPath("$.warnings").isArray());
    }

    @Test
    void assistantReportsMissingSecretWithoutBreakingTheBackend() throws Exception {
        mvc.perform(post("/api/v1/assistant/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"اشرح لي التوصية\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code", is("AI_NOT_CONFIGURED")));
    }
}
