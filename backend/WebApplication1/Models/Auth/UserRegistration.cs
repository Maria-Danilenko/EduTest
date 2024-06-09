namespace WebApplication1.Models.Auth
{
    public class UserRegistration
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string? PatronymicName { get; set; }
        public string Email { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Password { get; set; }
        public string Role { get; set; }
        public int[]? Subjects { get; set; }

        public int? ClassNumber { get; set; }
        public char? ClassLetter { get; set; }
        public DateTime LastLogin { get; set; }
    }
}
