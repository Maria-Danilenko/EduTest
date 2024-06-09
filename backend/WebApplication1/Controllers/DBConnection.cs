using Microsoft.Data.SqlClient;
using Newtonsoft.Json;

namespace WebApplication1.Controllers
{
    public class DBConnection
    {
        protected static SqlConnection GetSqlConnection()
        {
            return new SqlConnection("Server=DESKTOP-GF8REUK\\SQLEXPRESS;Database=EduTestDB;Trusted_Connection=true;Encrypt=False");
        }
        public static string ExecuteQuery(string commandText, Dictionary<string, object> parameters = null)
        {
            using (SqlConnection conn = GetSqlConnection())
            {
                conn.Open();
                using (SqlCommand cmd = new SqlCommand(commandText, conn))
                {
                    cmd.CommandType = System.Data.CommandType.Text;

                    if (parameters != null)
                    {
                        foreach (var parameter in parameters)
                        {
                            cmd.Parameters.AddWithValue(parameter.Key, parameter.Value);
                        }
                    }

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        var results = new List<string>();
                        while (reader.Read())
                        {
                            results.Add(reader.GetString(0));
                        }

                        return JsonConvert.SerializeObject(results);
                    }
                }
            }
        }
    }
}
