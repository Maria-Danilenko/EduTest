using System.Collections.Generic;

namespace WebApplication1.Models.Test
{
    public class StudentTestSubmission
    {
        public StudentTest StudentTest { get; set; }
        public List<StudentOpenQuestion>? StudentOpenQuestion { get; set; }
    }
}
