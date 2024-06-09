using System;
using System.ComponentModel.DataAnnotations;
using WebApplication4.Services;

namespace WebApplication1.Models.Auth
{
    public class UserTeacherAuth
    {
        public int Id { get; set; }
        public string Username { get; set; }

        private string _password;
        public string Password
        {
            get { return _password; }
            set { _password = EncryptionService.EncryptPassword(value); }
        }

        public string Firstname { get; set; }

        public string Lastname { get; set; }
        public string PatronymicName { get; set; }

        [EmailAddress]
        public string Email { get; set; }

        public DateTime DateOfBirth { get; set; }
        public string Subject { get; set; }
        public DateTime LastLogin { get; set; }
    }
}
