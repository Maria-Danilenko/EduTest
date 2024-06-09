using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using WebApplication4.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using NuGet.DependencyResolver;
using WebApplication1.DataContext;
using WebApplication1.Models.Auth;

namespace WebApplication4.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserAuthController : ControllerBase
    {
        private readonly IUserAuthService _userAuthService;
        private readonly AppDbContext _context;

        public UserAuthController(IUserAuthService userAuthService, AppDbContext context)
        {
            _userAuthService = userAuthService;
            _context = context;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Authenticate([FromBody] UserAuth model)
        {
            var token = await _userAuthService.Authenticate(model.Email, model.Password);

            if (token == null)
            {
                return BadRequest(new { message = "Invalid email or password" });
            }

            return Ok(new { token });
        }

        [Authorize]
        [HttpGet("{role}/{id}")]
        public async Task<ActionResult<UserAuth>> GetById(string role, int id)
        {
            var user = await _userAuthService.GetUserAuthByIdAsync(id, role);

            if (user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistration model)
        {
            return await _userAuthService.Register(model);
        }
    }
}
