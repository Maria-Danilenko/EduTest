namespace WebApplication1.Models.Test
{
    public class StudentOpenQuestion
    {
        public int Id { get; set; }
        public int Student_Test_Id { get; set; }
        public int Question_Id { get; set; }
        public string? Text { get; set; }
        public double? Score { get; set; }
    }
}
