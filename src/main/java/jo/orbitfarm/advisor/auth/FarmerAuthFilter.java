package jo.orbitfarm.advisor.auth;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
@Component
public class FarmerAuthFilter extends OncePerRequestFilter {
 private final AuthService auth; private final ObjectMapper mapper;
 public FarmerAuthFilter(AuthService auth,ObjectMapper mapper){this.auth=auth;this.mapper=mapper;}
 @Override protected boolean shouldNotFilter(HttpServletRequest request){String p=request.getRequestURI();return request.getMethod().equals("OPTIONS")||p.startsWith("/api/v1/auth/register/")||p.startsWith("/api/v1/auth/login/")||p.equals("/api/v1/subscriptions/plans")||p.startsWith("/api/v1/reference/")||p.startsWith("/actuator/")||p.startsWith("/swagger-ui")||p.startsWith("/v3/api-docs")||p.equals("/error");}
 @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
  String header=request.getHeader("Authorization");
  if(header==null||!header.startsWith("Bearer ")){unauthorized(request,response);return;}
  Long farmerId=auth.resolve(header.substring(7).trim());
  if(farmerId==null){unauthorized(request,response);return;}
  request.setAttribute("farmerId",farmerId);chain.doFilter(request,response);
 }
 private void unauthorized(HttpServletRequest request,HttpServletResponse response)throws IOException{response.setStatus(401);response.setContentType("application/json");response.setCharacterEncoding("UTF-8");mapper.writeValue(response.getWriter(),Map.of("timestamp",Instant.now(),"status",401,"code","UNAUTHORIZED","message","سجّل الدخول للمتابعة.","path",request.getRequestURI(),"fields",Map.of()));}
}
