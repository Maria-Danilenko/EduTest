namespace WebApplication1.Models.Profile
{
    public class Teacher
    {
        public int Id { get; set; }
        public string Password { get; set; }
        public string First_Name { get; set; }
        public string Last_Name { get; set; }
        public string Patronymic_Name { get; set; }
        public string Email { get; set; }
        public DateTime Date_Of_Birth { get; set; }
        public DateTime Last_Login { get; set; }

    }
}
