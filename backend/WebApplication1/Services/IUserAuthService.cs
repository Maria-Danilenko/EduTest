using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WebApplication1.DataContext;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models.Other;
using WebApplication1.Models.Auth;
using WebApplication1.Models.Profile;

namespace WebApplication4.Services
{
    public interface IUserAuthService
    {
        Task<string> Authenticate(string email, string password);
        Task<object> GetUserAuthByIdAsync(int id, string role);
        Task<IActionResult> Register(UserRegistration model);
    }

    public class UserAuthService : IUserAuthService
    {
        private readonly AppDbContext _context;

        public UserAuthService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> Authenticate(string email, string password)
        {
            var encryptedPassword = EncryptionService.EncryptPassword(password);

            var teacher = await _context.Teacher
                .FirstOrDefaultAsync(x => x.Email == email && x.Password == encryptedPassword);

            if (teacher != null)
            {
                teacher.Last_Login = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return GenerateToken(teacher.Id, "teacher");
            }

            var student = await _context.Student
                .FirstOrDefaultAsync(x => x.Email == email && x.Password == encryptedPassword);

            if (student != null)
            {
                student.Last_Login = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return GenerateToken(student.Id, "student");
            }

            return null;
        }


        private string GenerateToken(int userId, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes("edu_test_123_very_long_secret_key_123"));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }     

        public async Task<object> GetUserAuthByIdAsync(int id, string role)
        {
            if (role == "teacher")
            {
                var teacher = await _context.Teacher.FindAsync(id);
                if (teacher != null)
                {
                    return teacher;
                }
            }

            if (role == "student")
            {
                var student = await _context.Student.FindAsync(id);
                if (student != null)
                {
                    return student;
                }
            }

            return null;
        }

        public async Task<IActionResult> Register(UserRegistration model)
        {
            if (model == null)
            {
                return new BadRequestObjectResult("Invalid user data.");
            }

            if (await UserExists(model.Email))
            {
                return new BadRequestObjectResult("User with this email already exists.");
            }

            if (model.Role == "teacher")
            {
                if (string.IsNullOrEmpty(model.FirstName) || string.IsNullOrEmpty(model.LastName) || string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Password))
                {
                    return new BadRequestObjectResult("Missing fields for teacher registration.");
                }

                var encryptedPassword = EncryptionService.EncryptPassword(model.Password);

                var teacher = new Teacher
                {
                    First_Name = model.FirstName,
                    Last_Name = model.LastName,
                    Patronymic_Name = model.PatronymicName ?? "",
                    Email = model.Email,
                    Password = encryptedPassword,
                    Date_Of_Birth = model.DateOfBirth,
                    Last_Login = DateTime.UtcNow
                };

                _context.Teacher.Add(teacher);
                await _context.SaveChangesAsync();

                if (model.Subjects != null)
                {
                    foreach (var subjectId in model.Subjects)
                    {
                        var teacherSubject = new TeacherSubjects
                        {
                            Teacher_Id = teacher.Id,
                            Subject_Id = subjectId
                        };
                        _context.Teacher_Subjects.Add(teacherSubject);
                    }
                    await _context.SaveChangesAsync();
                }
            }
            else if (model.Role == "student")
            {
                if (string.IsNullOrEmpty(model.ClassNumber.ToString()) || string.IsNullOrEmpty(model.ClassLetter.ToString()) ||
                   string.IsNullOrEmpty(model.FirstName) || string.IsNullOrEmpty(model.LastName) ||
                   string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Password))
                {
                    return new BadRequestObjectResult("Missing fields for student registration.");
                }

                int classNumber = (int)model.ClassNumber;

                var encryptedPassword = EncryptionService.EncryptPassword(model.Password);

                var classLetter = model.ClassLetter.ToString().ToUpper();

                var classEntity = await _context.Class.FirstOrDefaultAsync(c => c.Number == classNumber && c.Letter.ToString() == classLetter);

                if (classEntity == null)
                {
                    return new BadRequestObjectResult("Class not found.");
                }

                var student = new Student
                {
                    First_Name = model.FirstName,
                    Last_Name = model.LastName,
                    Patronymic_Name = model.PatronymicName ?? "",
                    Email = model.Email,
                    Password = encryptedPassword,
                    Class_Id = classEntity.Id,
                    Date_Of_Birth = model.DateOfBirth,
                    Last_Login = DateTime.UtcNow
                };

                _context.Student.Add(student);
                await _context.SaveChangesAsync();

                return new OkObjectResult(new { message = "Student registered successfully" });
            }
            else
            {
                return new BadRequestObjectResult(new { message = "Invalid role specified." });
            }

            return new OkObjectResult(new { message = "Registration successful" });
        }

        private async Task<bool> UserExists(string email)
        {
            var userExists = await _context.Teacher.AnyAsync(u => u.Email == email) ||
                             await _context.Student.AnyAsync(u => u.Email == email);
            return userExists;
        }
    }
}
