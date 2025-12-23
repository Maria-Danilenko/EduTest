using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Data;
using WebApplication1.DataContext;
using WebApplication1.Models.Other;
using WebApplication1.Models.Profile;
using WebApplication1.Models.Test;
using WebApplication4.Services;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IUserAuthService _userAuthService;


        public ProfileController(AppDbContext context, IUserAuthService userAuthService)
        {
            _context = context;
            _userAuthService = userAuthService;
        }


        [AllowAnonymous]
        [HttpGet("subject")]
        public async Task<List<Subject>> GetSubjectsAsync()
        {
            return await _context.Subject.Select(s => new Subject
            {
                Id = s.Id,
                Name = s.Name
            }).ToListAsync();
        }


        [AllowAnonymous]
        [HttpGet("subject/{id}")]
        public async Task<ActionResult<Subject>> GetSubjectByIdAsync(int id)
        {
            if (_context.Test == null)
            {
                return NotFound();
            }
            var subject = await _context.Subject.FindAsync(id);

            if (subject == null)
            {
                return NotFound();
            }

            return subject;
        }  

        [Authorize]
        [HttpGet("student_class/{id}")]
        public async Task<IActionResult> GetClassByStudentIdAsync(int id)
        {
            Student student = (Student)await _userAuthService.GetUserAuthByIdAsync(id, "student");

            if (student == null)
            {
                return NotFound("Student not found.");
            }

            var classInfo = await _context.Class
                .Where(c => c.Id == student.Class_Id)
                .FirstOrDefaultAsync();

            if (classInfo == null)
            {
                return NotFound("Class for the student not found.");
            }

            return Ok(classInfo);
        }

        private async Task<Class> GetClassByNumberAndLetterAsync(int number, char letter)
        {
            return await _context.Class.FirstOrDefaultAsync(c => c.Number == number && c.Letter == letter);
        }

        [Authorize]
        [HttpPost("add_class_to_teacher/{teacherId}")]
        public async Task<IActionResult> SetClassToTeacherByIdAsync([FromBody] Class model, int teacherId)
        {
            var classEntity = await GetClassByNumberAndLetterAsync(model.Number, model.Letter);

            if (classEntity == null)
            {
                return NotFound("Class not found.");
            }

            var teacherClass = new TeacherClass
            {
                Class_Id = classEntity.Id,
                Teacher_Id = teacherId,
            };

            try
            {
                var existingRelation = await _context.Teacher_Class
                    .AnyAsync(tc => tc.Class_Id == classEntity.Id && tc.Teacher_Id == teacherId);
                if (existingRelation)
                {
                    return BadRequest("The teacher is already assigned to this class.");
                }

                _context.Teacher_Class.Add(teacherClass);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("An error occurred while adding the class to the teacher.");
            }

            return Ok("Class added to teacher successfully.");
        }

        [Authorize]
        [HttpGet("teachers_subject/{id}")]
        public IActionResult GetTeacherSubjectsByTeacherId(int id)
        {
            var query = @"
                SELECT s.Name 
                FROM Subject s
                JOIN teacher_subjects ts ON s.Id = ts.subject_id 
                WHERE ts.teacher_id = @teacherId";

            var parameters = new Dictionary<string, object>
                {
                    {"@teacherId", id}
                };

            var serializedSubjectNames = DBConnection.ExecuteQuery(query, parameters);

            var subjectNames = JsonConvert.DeserializeObject<List<string>>(serializedSubjectNames);

            return Ok(subjectNames);
        }

        [Authorize]
        [HttpPost("assignment_test/{testId}/{classId}")]
        public async Task<ActionResult<Assignment>> CreateAssignment(int testId, int classId)
        {
            if (_context.Assignment == null)
            {
                return NotFound();
            }

            var assignment = new Assignment
            {
                Test_Id = testId,
                Class_Id = classId,
            };

            try
            {
                var existingRelation = await _context.Assignment
                    .AnyAsync(a => a.Test_Id == testId && a.Class_Id == classId);
                if (existingRelation)
                {
                    return BadRequest("This test is already assigned to this class.");
                }

                _context.Assignment.Add(assignment);
                await _context.SaveChangesAsync();

                var students = await GetStudentsByClassIdAsync(classId);
                foreach (var student in students)
                {
                    await CreateStudentTest(student.Id, testId);
                }
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("An error occurred while assigning the test to the class.");
            }

            return Ok();
        }

        private async Task<ActionResult<StudentTest>> CreateStudentTest(int studentId, int testId)
        {
            if (_context.Student_Test == null)
            {
                return NotFound();
            }

            var studentTest = new StudentTest
            {
                Student_Id = studentId,
                Test_Id = testId,
                Score = null,
                Date_Time_Taken = null,
                State = -1,
            };

            try
            {
                var existingRelation = await _context.Student_Test
                    .AnyAsync(a => a.Test_Id == testId && a.Student_Id == studentId);
                if (existingRelation)
                {
                    return BadRequest($"This test is already assigned to the student with id '{studentId}'.");
                }

                _context.Student_Test.Add(studentTest);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("An error occurred while assigning the test to the student.");
            }

            return Ok();
        }

        [Authorize]
        [HttpGet("students_class/{classId}")]
        public async Task<List<Student>> GetStudentsInClassAsync(int classId)
        {
            return await GetStudentsByClassIdAsync(classId);
        }


        private async Task<List<Student>> GetStudentsByClassIdAsync(int classId)
        {
            var students = await _context.Student
                                 .Where(q => q.Class_Id == classId)
                                 .ToListAsync();

            return students;
        }

        [Authorize]
        [HttpGet("assignments_test/{testId}")]
        public async Task<List<Assignment>> GetAssignmentsByTestIdAsync(int testId)
        {
            var assignments = await _context.Assignment
                                .Where(a => a.Test_Id == testId)
                                .ToListAsync();

            return assignments;
        }

        [Authorize]
        [HttpGet("assignments_class/{classId}")]
        public async Task<List<Assignment>> GetAssignmentsByClassIdAsync(int classId)
        {
            var assignments = await _context.Assignment
                                .Where(a => a.Class_Id == classId)
                                .ToListAsync();

            return assignments;
        }

        [Authorize]
        [HttpGet("teachers_classes/{teacherId}")]
        public async Task<List<Class>> GetClassesByTeacherIdAsync(int teacherId)
        {
            var classIds = await _context.Teacher_Class
                        .Where(tc => tc.Teacher_Id == teacherId)
                        .Select(tc => tc.Class_Id)
                        .ToListAsync();

            var classes = await _context.Class
                                .Where(c => classIds.Contains(c.Id))
                                .ToListAsync();

            return classes;
        }

        [Authorize]
        [HttpGet("student_tests/{studentId}")]
        public async Task<List<StudentTest>> GetStudentTestsByStudentIdAsync(int studentId)
        {
            var studentTests = await _context.Student_Test
                                .Where(s => s.Student_Id == studentId)
                                .ToListAsync();

            return studentTests;
        }


        [Authorize]
        [HttpGet("student_tests_id/{testId}")]
        public async Task<List<StudentTest>> GetStudentTestsByTestIdAsync(int testId)
        {
            var studentTests = await _context.Student_Test
                                .Where(s => s.Test_Id == testId)
                                .ToListAsync();

            return studentTests;
        }

        [Authorize]
        [HttpGet("student/{studentId}")]
        public async Task<Student> GetStudentByIdAsync(int studentId)
        {
            var student = await _context.Student
                                .Where(s => s.Id == studentId)
                                .FirstOrDefaultAsync();

            return student;
        }
    }
}
