package jo.orbitfarm.advisor.pack;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PackValidatorTest {
    @Test
    void acceptsTheIllustrativeJordanPackButItRemainsMarkedAsDemo() throws Exception {
        try (InputStream input = getClass().getResourceAsStream("/packs/jordan-demo.json")) {
            CropPack pack = new ObjectMapper().readValue(input, CropPack.class);
            assertTrue(PackValidator.validate(pack).isEmpty());
            assertTrue(pack.demo());
        }
    }
}
