using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Text;
using WebApplication1.DataContext;
using WebApplication1.Models.MLModule;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MLStudentAnalysisController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MLStudentAnalysisController(AppDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<Student_Analysis>> GetLatestAnalysis(
            int studentId,
            [FromQuery] string scope = "all")
        {
            scope = NormalizeScope(scope);

            var analysis = await GetLatestAnalysisFromDb(studentId, scope);

            var isStale = await IsAnalysisStaleAsync(studentId, scope, analysis);

            if (isStale)
            {
                var fresh = await RunPythonAndLoadAnalysisAsync(studentId, scope);
                if (fresh != null)
                {
                    analysis = fresh;
                }
            }

            if (analysis == null)
            {
                return NotFound("Analysis for this student was not found.");
            }

            return Ok(analysis);
        }

        [Authorize]
        [HttpGet("student/{studentId}/history")]
        public async Task<ActionResult<List<Student_Analysis>>> GetAnalysisHistory(
            int studentId,
            [FromQuery] string scope = null)
        {
            IQueryable<Student_Analysis> query = _context.Student_Analysis
                .Include(a => a.Directions)
                .Include(a => a.WeakTopics)
                .Where(a => a.Student_Id == studentId);

            if (!string.IsNullOrWhiteSpace(scope))
            {
                scope = NormalizeScope(scope);

                if (scope == "all" || scope == "current_class")
                {
                    query = query.Where(a => a.Scope == scope);
                }
            }

            var list = await query
                .OrderByDescending(a => a.Generated_At)
                .ToListAsync();

            return Ok(list);
        }

        [Authorize]
        [HttpGet("analysis/{analysisId}")]
        public async Task<ActionResult<Student_Analysis>> GetAnalysisById(int analysisId)
        {
            var analysis = await _context.Student_Analysis
                .Include(a => a.Directions)
                .Include(a => a.WeakTopics)
                .FirstOrDefaultAsync(a => a.Id == analysisId);

            if (analysis == null)
            {
                return NotFound("Analysis not found.");
            }

            return Ok(analysis);
        }

        [Authorize]
        [HttpPost("run")]
        public async Task<ActionResult<Student_Analysis>> RunAnalysis([FromBody] Run_Analysis_Request request)
        {
            if (request == null)
            {
                return BadRequest("Request body is empty.");
            }

            var scope = NormalizeScope(request.Scope);

            if (scope != "all" && scope != "current_class")
            {
                return BadRequest("Scope must be 'all' or 'current_class'.");
            }

            var analysis = await RunPythonAndLoadAnalysisAsync(request.Student_Id, scope);

            if (analysis == null)
            {
                return StatusCode(500, new
                {
                    message = "Python analysis failed or did not produce any record."
                });
            }

            return Ok(analysis);
        }
        private string NormalizeScope(string scope)
        {
            if (string.IsNullOrWhiteSpace(scope))
                return "all";

            scope = scope.ToLowerInvariant();

            if (scope != "all" && scope != "current_class")
                scope = "all";

            return scope;
        }

        private async Task<Student_Analysis?> GetLatestAnalysisFromDb(int studentId, string scope)
        {
            IQueryable<Student_Analysis> query = _context.Student_Analysis
                .Include(a => a.Directions)
                .Include(a => a.WeakTopics)
                .Where(a => a.Student_Id == studentId && a.Scope == scope);

            if (scope == "current_class")
            {
                var student = await _context.Student
                    .FirstOrDefaultAsync(s => s.Id == studentId);

                if (student == null || student.Class_Id == null)
                    return null;

                int currentClassId = student.Class_Id;
                query = query.Where(a => a.Class_Id == currentClassId);
            }

            return await query
                .OrderByDescending(a => a.Generated_At)
                .FirstOrDefaultAsync();
        }

        private async Task<bool> IsAnalysisStaleAsync(
            int studentId,
            string scope,
            Student_Analysis? analysis)
        {
            if (analysis == null)
                return true;

            var testsQuery = _context.Student_Test
                .Where(t => t.Student_Id == studentId && t.State == 1);

            var lastTestDate = await testsQuery
                .MaxAsync(t => (DateTime?)t.Date_Time_Taken);

            if (lastTestDate == null)
                return false;

            return lastTestDate > analysis.Generated_At;
        }

        private async Task<Student_Analysis?> RunPythonAndLoadAnalysisAsync(
            int studentId,
            string scope)
        {
            string pythonExePath = @"C:\Users\Rin\AppData\Local\Programs\Python\Python313\python.exe";
            string scriptPath = @"D:\%UNIVER\pythonProject\main.py";

            var psi = new ProcessStartInfo
            {
                FileName = pythonExePath,
                Arguments = $"\"{scriptPath}\" {studentId} {scope}",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            psi.Environment["PYTHONIOENCODING"] = "utf-8";
            psi.Environment["PYTHONUTF8"] = "1";

            string stdOut;
            string stdErr;

            try
            {
                using var process = new Process { StartInfo = psi };

                process.Start();

                stdOut = await process.StandardOutput.ReadToEndAsync();
                stdErr = await process.StandardError.ReadToEndAsync();

                await process.WaitForExitAsync();

                if (process.ExitCode != 0)
                {
                    return null;
                }
            }
            catch
            {
                return null;
            }

            return await GetLatestAnalysisFromDb(studentId, scope);
        }
    }
}
