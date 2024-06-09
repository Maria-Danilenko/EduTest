namespace WebApplication1.Models.Test
{
    public class TestData
    {
        public int Id { get; set; }
        public int TeacherId { get; set; }
        public string TestName { get; set; }
        public string? Description { get; set; }
        public bool IsTimeLimitEnabled { get; set; }
        public int? Duration { get; set; }
        public int SubjectId { get; set; }
        public double MaxScore { get; set; }
        public List<QuestionData> Questions { get; set; }
    }

    public class QuestionData
    {
        public int Id { get; set; }
        public string QuestionText { get; set; }
        public int QuestionTypeId { get; set; }
        public double Marks { get; set; }
        public List<VariantData>? Variants { get; set; }
    }

    public class VariantData
    {
        public int Id { get; set; }
        public string VariantText { get; set; }
        public bool? IsCorrect { get; set; }
        public string? AnswerText { get; set; }
    }
}
