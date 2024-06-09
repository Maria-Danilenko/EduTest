using System.Text.Json.Serialization;

namespace WebApplication1.Models.Test
{
    public class Test
    {
        public int Id { get; set; }
        public int Teacher_Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Date_Of_Creating { get; set; }
        public int Subject_Id { get; set; }
        public double Max_Score { get; set; }
        public int? Duration { get; set; }
    }
}
