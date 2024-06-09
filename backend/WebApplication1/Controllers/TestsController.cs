using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication1.DataContext;
using WebApplication1.Models.Other;
using WebApplication1.Models.Profile;
using WebApplication1.Models.Test;
using static System.Net.Mime.MediaTypeNames;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestsController(AppDbContext context)
        {
            _context = context;
        }

        [AllowAnonymous]
        [HttpGet("question_types")]
        public async Task<IActionResult> GetQuestionTypes()
        {
            var questionTypes = await _context.Question_Type.Select(s => new Models.Test.QuestionType
            {
                Id = s.Id,
                Name = s.Name
            }).ToListAsync();

            return Ok(questionTypes);
        }

        private async Task<IActionResult> PostTest(Test test)
        {
            if (_context.Test == null)
            {
                return BadRequest(new { message = "Entity is null" });

            }
            _context.Test.Add(test);
            await _context.SaveChangesAsync();

            return Ok();
        }

        private async Task<IActionResult> PostQuestion(Question question)
        {
            if (_context.Question == null)
            {
                return BadRequest(new { message = "Entity is null" });

            }
            _context.Question.Add(question);
            await _context.SaveChangesAsync();

            return Ok();
        }

        private async Task<IActionResult> PostOption(Option option)
        {
            if (_context.Option == null)
            {
                return BadRequest(new { message = "Entity is null" });

            }
            _context.Option.Add(option);
            await _context.SaveChangesAsync();

            return Ok();
        }

        private async Task<IActionResult> PostOptionMatching(OptionMatching option)
        {
            if (_context.Option_Matching == null)
            {
                return BadRequest(new { message = "Entity is null" });

            }
            _context.Option_Matching.Add(option);
            await _context.SaveChangesAsync();

            return Ok();
        }


        [Authorize]
        [HttpPost("create_new_test")]
        public async Task<IActionResult> CreateNewTestAsync(TestData testData)
        {
            var test = new Test
            {
                Teacher_Id = testData.TeacherId,
                Name = testData.TestName,
                Description = testData.Description,
                Duration = testData.IsTimeLimitEnabled ? testData.Duration : null,
                Max_Score = testData.MaxScore,
                Subject_Id = testData.SubjectId,
                Date_Of_Creating = DateTime.Now,
            };

            await PostTest(test);

            foreach (var questionData in testData.Questions)
            {
                var question = new Question
                {
                    Test_Id = test.Id,
                    Text = questionData.QuestionText,
                    Type_Id = questionData.QuestionTypeId,
                    Marks = questionData.Marks
                };

                await PostQuestion(question);

                foreach (var variant in questionData.Variants)
                {
                    if (questionData.QuestionTypeId == 4)
                    {
                        var optionMatching = new OptionMatching
                        {
                            Question_Id = question.Id,
                            Variant_Text = variant.VariantText,
                            Answer_Text = variant.AnswerText
                        };
                        await PostOptionMatching(optionMatching);
                    }
                    else if (questionData.QuestionTypeId != 3)
                    {
                        var option = new Option
                        {
                            Question_Id = question.Id,
                            Text = variant.VariantText,
                            Is_Correct = variant.IsCorrect ?? false
                        };
                        await PostOption(option);
                    }
                }
            }

            return Ok();
        }


        [Authorize]
        [HttpGet("get_test/{id}")]
        public async Task<IActionResult> GetTestDataByIdAsync(int id)
        {
            var testResult = await GetTestById(id);
            if (testResult.Result is NotFoundResult)
            {
                return NotFound();
            }

            var test = testResult.Value;

            var questions = await GetTestQuestionsById(id);
            if (questions == null || !questions.Any())
            {
                return NotFound("No questions found for this test.");
            }

            var testData = new TestData
            {
                Id = test.Id,
                TeacherId = test.Teacher_Id,
                TestName = test.Name,
                Description = test.Description,
                IsTimeLimitEnabled = test.Duration.HasValue,
                Duration = test.Duration ?? 0,
                SubjectId = test.Subject_Id,
                MaxScore = test.Max_Score,
                Questions = new List<QuestionData>()
            };

            foreach (var question in questions)
            {
                var questionData = new QuestionData
                {
                    Id = question.Id,
                    QuestionText = question.Text,
                    QuestionTypeId = question.Type_Id,
                    Marks = question.Marks,
                    Variants = new List<VariantData>()
                };

                var options = await GetQuestionOptionsById(question.Id);

                foreach (var option in options)
                {
                    var variantData = new VariantData
                    {
                        Id = option.Id,
                        VariantText = option.Text,
                        IsCorrect = option.Is_Correct
                    };
                    questionData.Variants.Add(variantData);
                }

                var optionsMatching = await GetQuestionOptionsMatchingById(question.Id);
                foreach (var matching in optionsMatching)
                {
                    var variantData = new VariantData
                    {
                        Id = matching.Id,
                        VariantText = matching.Variant_Text,
                        AnswerText = matching.Answer_Text
                    };
                    questionData.Variants.Add(variantData);
                }

                testData.Questions.Add(questionData);
            }

            return Ok(testData);
        }

        [Authorize]
        [HttpPost("update_test")]
        public async Task<IActionResult> UpdateTestAsync([FromBody]TestData testData)
        {
            try
            {
                var existingTest = await _context.Test.FirstOrDefaultAsync(t => t.Id == testData.Id);
                if (existingTest == null)
                {
                    return NotFound($"Test with ID {testData.Id} not found.");
                }
                var questions = await GetTestQuestionsById(existingTest.Id);
                if (questions == null || !questions.Any())
                {
                    return NotFound("No questions found for this test.");
                }

                existingTest.Name = testData.TestName;
                existingTest.Description = testData.Description;
                existingTest.Duration = testData.IsTimeLimitEnabled ? testData.Duration : null;
                existingTest.Max_Score = testData.MaxScore;
                existingTest.Subject_Id = testData.SubjectId;

                var questionIdsToUpdate = testData.Questions.Select(q => q.Id).ToList();

                var questionsToRemove = questions.Where(q => !questionIdsToUpdate.Contains(q.Id)).ToList();

                foreach (var question in questionsToRemove)
                {
                    var options = _context.Option.Where(o => o.Question_Id == question.Id).ToList();
                    _context.Option.RemoveRange(options);

                    var optionsMatching = _context.Option_Matching.Where(o => o.Question_Id == question.Id).ToList();
                    _context.Option_Matching.RemoveRange(optionsMatching);

                    _context.Question.Remove(question);
                }

                await _context.SaveChangesAsync();

                foreach (var questionData in testData.Questions)
                {
                    var existingQuestion = questions.FirstOrDefault(q => q.Id == questionData.Id);
                    if (existingQuestion != null)
                    {
                        existingQuestion.Text = questionData.QuestionText;
                        existingQuestion.Type_Id = questionData.QuestionTypeId;
                        existingQuestion.Marks = questionData.Marks;

                        await _context.SaveChangesAsync();

                        var options = await GetQuestionOptionsById(existingQuestion.Id);
                        var optionIdsToUpdate = questionData.Variants.Select(v => v.Id).ToList();
                        var optionsToRemove = options.Where(o => !optionIdsToUpdate.Contains(o.Id)).ToList();
                        foreach (var option in optionsToRemove)
                        {
                            options.Remove(option);
                            _context.Option.Remove(option);
                            await _context.SaveChangesAsync();
                        }

                        var optionsMatching = await GetQuestionOptionsMatchingById(existingQuestion.Id);
                        var optionMatchingIdsToUpdate = questionData.Variants.Select(v => v.Id).ToList();
                        var optionsMatchingToRemove = optionsMatching.Where(o => !optionMatchingIdsToUpdate.Contains(o.Id)).ToList();
                        foreach (var option in optionsMatchingToRemove)
                        {
                            optionsMatching.Remove(option);
                            _context.Option_Matching.Remove(option);
                            await _context.SaveChangesAsync();
                        }

                        foreach (var variantData in questionData.Variants)
                        {
                            if (questionData.QuestionTypeId == 4)
                            {
                                var existingOption = optionsMatching.FirstOrDefault(o => o.Id == variantData.Id);

                                if (existingOption != null)
                                {
                                    existingOption.Variant_Text = variantData.VariantText;
                                    existingOption.Answer_Text = variantData.AnswerText;
                                }
                                else
                                {
                                    var newOption = new OptionMatching
                                    {
                                        Variant_Text = variantData.VariantText,
                                        Answer_Text = variantData.AnswerText,
                                        Question_Id = existingQuestion.Id
                                    };
                                    optionsMatching.Add(newOption);
                                    _context.Option_Matching.Add(newOption);
                                    await _context.SaveChangesAsync();
                                }

                            }
                            else if (questionData.QuestionTypeId != 3)
                            {
                                var existingOption = options.FirstOrDefault(o => o.Id == variantData.Id);

                                if (existingOption != null)
                                {
                                    existingOption.Text = variantData.VariantText;
                                    existingOption.Is_Correct = variantData.IsCorrect ?? false;
                                }
                                else
                                {
                                    var newOption = new Option
                                    {
                                        Text = variantData.VariantText,
                                        Is_Correct = variantData.IsCorrect ?? false,
                                        Question_Id = existingQuestion.Id
                                    };
                                    options.Add(newOption);
                                    _context.Option.Add(newOption);
                                    await _context.SaveChangesAsync();
                                }
                            }
                        }
                    }
                    if (existingQuestion == null)
                    {
                        var newQuestion = new Question
                        {
                            Text = questionData.QuestionText,
                            Type_Id = questionData.QuestionTypeId,
                            Marks = questionData.Marks,
                            Test_Id = existingTest.Id
                        };
                        questions.Add(newQuestion);
                        _context.Question.Add(newQuestion);
                        await _context.SaveChangesAsync();

                        foreach (var variant in questionData.Variants)
                        {
                            if (questionData.QuestionTypeId == 4)
                            {
                                var optionMatching = new OptionMatching
                                {
                                    Question_Id = newQuestion.Id,
                                    Variant_Text = variant.VariantText,
                                    Answer_Text = variant.AnswerText
                                };
                                await PostOptionMatching(optionMatching);
                            }
                            else if (questionData.QuestionTypeId != 3)
                            {
                                var option = new Option
                                {
                                    Question_Id = newQuestion.Id,
                                    Text = variant.VariantText,
                                    Is_Correct = variant.IsCorrect ?? false
                                };
                                await PostOption(option);
                            }
                        }
                    }
                }

                return Ok();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to update test: {Error}", ex.Message);
                return StatusCode(500, "Internal server error");
            }
        }


        [Authorize]
        [HttpGet("test/{id}")]
        public async Task<ActionResult<Test>> GetTestById(int id)
        {
            if (_context.Test == null)
            {
                return NotFound();
            }
            var test = await _context.Test.FindAsync(id);

            if (test == null)
            {
                return NotFound();
            }

            return test;
        }

        private async Task<List<Question>> GetTestQuestionsById(int testId)
        {         
            var questions = await _context.Question
                                             .Where(q => q.Test_Id == testId)
                                             .ToListAsync();          

            return questions;
        }

        private async Task<List<Option>> GetQuestionOptionsById(int questionId)
        {
            var options = await _context.Option
                                             .Where(q => q.Question_Id == questionId)
                                             .ToListAsync();

            return options;
        }

        private async Task<List<OptionMatching>> GetQuestionOptionsMatchingById(int questionId)
        {
            var optionsMatching = await _context.Option_Matching
                                             .Where(q => q.Question_Id == questionId)
                                             .ToListAsync();

            return optionsMatching;
        }


        [Authorize]
        [HttpGet("tests/{teacherId}")]
        public async Task<ActionResult<IEnumerable<Test>>> GetAllTestsByTeacherId(int teacherId)
        {
            if (_context.Test == null)
            {
                return NotFound();
            }
            return await _context.Test
                .Where(t => t.Teacher_Id == teacherId)
                .ToListAsync();
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTest(int id)
        {
            if (_context.Test == null)
            {
                return NotFound();
            }
            var test = await _context.Test.FindAsync(id);
            if (test == null)
            {
                return NotFound();
            }

            var questions = await GetTestQuestionsById(id);
            if (questions == null || !questions.Any())
            {
                return NotFound("No questions found for this test.");
            }

            foreach (var question in questions)
            {                

                if (question.Type_Id == 4)
                {
                    foreach (var option in await GetQuestionOptionsMatchingById(question.Id))
                    {
                        _context.Option_Matching.Remove(option);
                        await _context.SaveChangesAsync();
                    }

                }

                else if (question.Type_Id != 3)
                {
                    foreach (var option in await GetQuestionOptionsById(question.Id))
                    {
                        _context.Option.Remove(option);
                        await _context.SaveChangesAsync();
                    }
                }

                _context.Question.Remove(question);
                await _context.SaveChangesAsync();
            }

            await DeleteStudentTestsByTestId(id);

            await DeleteAssignmentByTestId(id);

            _context.Test.Remove(test);
            await _context.SaveChangesAsync();

            return Ok();
        }

        private async Task<IActionResult> DeleteStudentTestsByTestId(int testId)
        {
            if (_context.Student_Test == null)
            {
                return NotFound();
            }
            var studentTests = await _context.Student_Test
                   .Where(s => s.Test_Id == testId)
                   .ToListAsync();

            if (studentTests == null || !studentTests.Any())
            {
                return BadRequest("Student tests do not exist.");
            }

            _context.Student_Test.RemoveRange(studentTests);
            await _context.SaveChangesAsync();

            return Ok();
        }

        private async Task<IActionResult> DeleteAssignmentByTestId(int testId)
        {
            if (_context.Assignment == null)
            {
                return NotFound();
            }
            var assignments = await _context.Assignment
                   .Where(s => s.Test_Id == testId)
                   .ToListAsync();

            if (assignments == null || !assignments.Any())
            {
                return BadRequest("Assignments do not exist.");
            }

            _context.Assignment.RemoveRange(assignments);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [Authorize]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Test>>> GetAllTests()
        {
          if (_context.Test == null)
          {
              return NotFound();
          }
            return await _context.Test.ToListAsync();
        }


        [Authorize]
        [HttpPost("student_test")]
        public async Task<ActionResult<StudentTest>> SaveStudentAnswers([FromBody] StudentTestSubmission submission)
        {
            if (_context.Student_Test == null)
            {
                return NotFound();
            }

            try
            {
                var existingStudentTest = await _context.Student_Test
                    .FirstOrDefaultAsync(a => a.Test_Id == submission.StudentTest.Test_Id && a.Student_Id == submission.StudentTest.Student_Id);

                if (existingStudentTest == null)
                {
                    return BadRequest("You have already passed this test.");
                }
                else
                {
                    existingStudentTest.Score = submission.StudentTest.Score;
                    existingStudentTest.Date_Time_Taken = DateTime.Now;

                    var testQuestions = await GetTestQuestionsById(submission.StudentTest.Test_Id);

                    foreach (var question in testQuestions)
                    {
                        if (question.Type_Id == 3 && submission.StudentOpenQuestion != null)
                        {
                            existingStudentTest.State = 0;
                            foreach (var openQuestion in submission.StudentOpenQuestion)
                            {
                                var createOpenQuestionResult = await CreateStudentOpenQuestion(openQuestion, existingStudentTest.Id);
                                if (!createOpenQuestionResult.Result.Equals(Ok()))
                                {
                                    return createOpenQuestionResult.Result;
                                }
                            }
                        }
                    }

                    if (existingStudentTest.State != 0)
                    {
                        existingStudentTest.State = 1;
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return BadRequest($"An error occurred while saving the test answers: {ex.Message}");
            }

            return Ok();
        }

        private async Task<ActionResult<StudentOpenQuestion>> CreateStudentOpenQuestion(StudentOpenQuestion studentOpenQuestion, int studentTestId)
        {
            if (_context.Student_Open_Question == null)
            {
                return NotFound();
            }

            var existingRelation = await _context.Student_Open_Question
                   .AnyAsync(s => s.Student_Test_Id == studentTestId
                   && s.Question_Id == studentOpenQuestion.Question_Id);

            if (existingRelation)
            {
                return BadRequest("The answer to the open question already exists in this test.");
            }

            studentOpenQuestion.Student_Test_Id = studentTestId;

            _context.Student_Open_Question.Add(studentOpenQuestion);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [Authorize]
        [HttpGet("student_open_questions/{studentTestId}")]
        public async Task<List<StudentOpenQuestion>> GetStudentOpenQuestionsByStudentTestIdAsync(int studentTestId)
        {
            var studentOpenQuestions = await _context.Student_Open_Question
                                .Where(s => s.Student_Test_Id == studentTestId)
                                .ToListAsync();

            return studentOpenQuestions;
        }

        [Authorize]
        [HttpGet("question/{questionId}")]
        public async Task<Question> GetQuestionByQuestionId(int questionId)
        {
            var question = await _context.Question
                                             .Where(q => q.Id == questionId)
                                             .FirstOrDefaultAsync();

            return question;
        }

        [Authorize]
        [HttpPost("update_open_question_score/{openQuestionId}")]
        public async Task<ActionResult<StudentOpenQuestion>> UpdateStudentOpenQuestionScoreById([FromBody]int score, int openQuestionId)
        {
            if (_context.Student_Open_Question == null)
            {
                return NotFound();
            }
            var studentOpenQuestion = await _context.Student_Open_Question
                   .FirstOrDefaultAsync(s => s.Id == openQuestionId);

            if (studentOpenQuestion == null)
            {
                return BadRequest("The student open question does not exist.");
            }

            studentOpenQuestion.Score = score;
            await _context.SaveChangesAsync();

            return Ok(studentOpenQuestion);
        }

        [Authorize]
        [HttpPost("update_student_test/{studentTestId}")]
        public async Task<ActionResult<StudentTest>> UpdateStudentTestScoreById([FromBody] int score, int studentTestId)
        {
            if (_context.Student_Test == null)
            {
                return NotFound();
            }
            var studentTest = await _context.Student_Test
                   .FirstOrDefaultAsync(s => s.Id == studentTestId);

            if (studentTest == null)
            {
                return BadRequest("The student test does not exist.");
            }

            studentTest.Score += score;
            studentTest.State = 1;
            await _context.SaveChangesAsync();

            return Ok(studentTest);
        }

    }
}
