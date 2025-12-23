using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using WebApplication1.Models.Profile;

namespace WebApplication1.Models.MLModule
{
    public class Student_Analysis
    {
        public int Id { get; set; }

        public int Student_Id { get; set; }
        public string Scope { get; set; } = null!;
        public int? Class_Id { get; set; }
        public DateTime Generated_At { get; set; }

        public string? Main_Profile_Text { get; set; }
        public string? Career_Text { get; set; }
        public string? Weak_Directions_Text { get; set; }
        public string? Worsening_Subjects_Text { get; set; }

        [JsonIgnore]
        [ForeignKey(nameof(Student_Id))]
        public Student Student { get; set; } = null!;

        [JsonIgnore]
        [ForeignKey(nameof(Class_Id))]
        public Class? Class { get; set; }

        public ICollection<Student_Analysis_Direction> Directions { get; set; }
            = new List<Student_Analysis_Direction>();

        public ICollection<Student_Analysis_Weak_Topics> WeakTopics { get; set; }
            = new List<Student_Analysis_Weak_Topics>();
    }

    public class Student_Analysis_Direction
    {
        public int Id { get; set; }
        public int Analysis_Id { get; set; }

        public string Direction_Name { get; set; } = null!;
        public decimal Avg_Score { get; set; }
        public byte Hist_Level { get; set; }          
        public decimal Forecast_Score { get; set; }
        public byte Forecast_Level { get; set; }     
        public int Tests_Count { get; set; }


        [JsonIgnore]
        [ForeignKey(nameof(Analysis_Id))]
        public Student_Analysis Analysis { get; set; } = null!;
    }

    public class Student_Analysis_Weak_Topics
    {
        public int Id { get; set; }
        public int Analysis_Id { get; set; }

        public string Direction_Name { get; set; } = null!;
        public string Subject_Name { get; set; } = null!;
        public string Topic_Name { get; set; } = null!;
        public decimal Topic_Score { get; set; }

        [JsonIgnore]
        [ForeignKey(nameof(Analysis_Id))]
        public Student_Analysis Analysis { get; set; } = null!;
    }

    public class Run_Analysis_Request
    {
        public int Student_Id { get; set; }
        public string Scope { get; set; } = "all";
    }
}
