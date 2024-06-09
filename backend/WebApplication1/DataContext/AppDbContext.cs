using Microsoft.EntityFrameworkCore;
using System.Data.SqlClient;
using Microsoft.Data.SqlClient;
using WebApplication1.Models.Test;
using WebApplication1.Models.Profile;
using WebApplication1.Models.Other;

namespace WebApplication1.DataContext
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Teacher> Teacher { get; set; }
        public DbSet<Student> Student { get; set; }
        public DbSet<Class> Class { get; set; }
        public DbSet<Subject> Subject { get; set; }
        public DbSet<TeacherSubjects> Teacher_Subjects { get; set; }
        public DbSet<TeacherClass> Teacher_Class { get; set; }
        public DbSet<Test> Test { get; set; }
        public DbSet<Question> Question { get; set; }
        public DbSet<Option> Option { get; set; }
        public DbSet<OptionMatching> Option_Matching { get; set; }
        public DbSet<QuestionType> Question_Type { get; set; }
        public DbSet<Assignment> Assignment { get; set; }
        public DbSet<StudentTest> Student_Test { get; set; }
        public DbSet<StudentOpenQuestion> Student_Open_Question { get; set; }
    }
}