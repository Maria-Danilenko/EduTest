import React, { useEffect, useState } from "react";
import { notification, Spin, Button } from "antd";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

const openNotification = () => {
  notification.warning({
    message: "Test Notification",
    description:
      "You have tests that needs to be check. Please check your Tests section.",
    placement: "bottomRight",
    key: "testToCheckNotification",
  });
};

const TeacherProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [userDetails, setUserDetails] = useState({
    name: "",
    subject: [],
    dob: "",
    email: "",
  });

  const [classInfo, setClassInfo] = useState({
    number: "",
    letter: "",
  });

  const getTests = async () => {
    try {
      const response = await axios.get(`/api/Tests/tests/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return response.data;
    } catch (error) {
      notification.error({
        message: "Failed to Fetch Tests",
        description:
          error.response?.data ||
          error.message ||
          "An error occurred while trying to fetch tests.",
      });
      return [];
    }
  };

  const getStudentTests = async (testId) => {
    try {
      const response = await axios.get(
        `/api/Profile/student_tests_id/${testId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      return response.data;
    } catch (error) {
      notification.error({
        message: "Failed to Fetch Student Tests",
        description:
          error.response?.data ||
          error.message ||
          `An error occurred while trying to to fetch student tests for test ID ${testId}.`,
        placement: "bottomRight",
      });
      return [];
    }
  };

  const fetchStudentTests = async () => {
    const tests = await getTests();
    const studentTestsPromises = tests.map((test) => getStudentTests(test.id));
    const studentTestsArrays = await Promise.all(studentTestsPromises);

    const allStudentTests = studentTestsArrays.flat();

    const studentTestsStateZero = allStudentTests.filter(
      (test) => test.state === 0
    );

    return studentTestsStateZero;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClassInfo((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `/api/Profile/add_class_to_teacher/${user.id}`,
        {
          number: parseInt(classInfo.number, 10),
          letter: classInfo.letter.toUpperCase(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      notification.success({
        message: "Class Added",
        description: "The class has been successfully added to the teacher.",
        placement: "bottomRight",
      });
    } catch (error) {
      notification.error({
        message: "Failed to Add Class",
        description:
          error.response?.data ||
          error.message ||
          "An error occurred while trying to add the class.",
        placement: "bottomRight",
      });
    }
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(
          `/api/UserAuth/${user.role}/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = response.data;

        const responseSubjects = await axios.get(
          `/api/Profile/teachers_subject/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const subjects = responseSubjects.data;
        setLoading(false);

        setUserDetails({
          name: `${data.first_Name} ${data.last_Name} ${data.patronymic_Name}`,
          subject: subjects,
          dob: moment(data.date_Of_Birth).format("DD.MM.YYYY"),
          email: data.email,
        });
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        notification.error({
          message: "Error",
          description: "Failed to fetch user details.",
        });
        setLoading(false);
      }
    };

    fetchUserDetails();

    const fetchAndCheckStudentTests = async () => {
      const testData = await fetchStudentTests();
      if (testData && testData.length > 0) {
        openNotification();
      }
    };

    fetchAndCheckStudentTests();
  }, [user.id, user.role]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <div>
          <h1>{userDetails.name}</h1>
          <div
            style={{
              backgroundColor: "#f2f2f2",
              width: "100px",
              padding: "7px 0",
              textAlign: "center",
            }}
          >
            Teacher
          </div>
        </div>
        <div>
          <form onSubmit={handleSubmit}>
            <div className="d-flex justify-content-between">
              <input
                type="number"
                name="number"
                min={1}
                className="form-control me-2"
                style={{ width: "60px" }}
                placeholder="1"
                value={classInfo.number}
                onChange={handleChange}
              />
              <input
                type="text"
                name="letter"
                maxLength="1"
                className="form-control me-2"
                style={{ width: "60px" }}
                placeholder="A"
                value={classInfo.letter}
                onChange={handleChange}
              />
            </div>
            <Button
              type="primary"
              ghost
              htmlType="submit"
              style={{
                width: "130px",
                marginTop: "10px",
                fontSize: "16px",
                height: "35px",
              }}
            >
              Add class
            </Button>
          </form>
        </div>
      </div>
      <hr />
      <div>
        <h2 style={{ color: "gray", marginBottom: "20px" }}>Details</h2>
        <p>
          <b>Subjects</b>
          <br />
          {userDetails.subject.map((subject, index) => (
            <React.Fragment key={index}>
              {subject}
              <br />
            </React.Fragment>
          ))}
        </p>
        <p>
          <b>Date of birth</b>
          <br />
          {userDetails.dob}
        </p>
        <p>
          <b>Email</b>
          <br />
          {userDetails.email}
        </p>
      </div>
    </div>
  );
};

export default TeacherProfile;
