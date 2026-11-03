package jo.orbitfarm.advisor.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> handleApi(ApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorBody(Instant.now(), ex.getStatus().value(),
                ex.getCode(), ex.getMessage(), request.getRequestURI(), Map.of()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, e -> e.getDefaultMessage() == null ? "Invalid value" : e.getDefaultMessage(), (a,b) -> a));
        return ResponseEntity.badRequest().body(new ErrorBody(Instant.now(), 400, "VALIDATION_ERROR",
                "Request validation failed", request.getRequestURI(), fields));
    }
    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<?> handleConstraint(ConstraintViolationException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(new ErrorBody(Instant.now(), 400, "VALIDATION_ERROR",
                ex.getMessage(), request.getRequestURI(), Map.of()));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> handleOther(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorBody(Instant.now(), 500,
                "INTERNAL_ERROR", "An unexpected error occurred", request.getRequestURI(), Map.of()));
    }
    public record ErrorBody(Instant timestamp, int status, String code, String message, String path, Map<String, String> fields) {}
}
