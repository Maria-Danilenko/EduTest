using System;
using System.ComponentModel.DataAnnotations;
using WebApplication4.Services;

namespace WebApplication1.Models.Auth
{
    public class UserAuth
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}
