import React, { useEffect, useState } from "react";
import { notification, Spin } from "antd";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

const openNotification = () => {
  notification.warning({
    message: "Test Notification",
    description:
      "You have a pending test that needs to be taken. Please check your Tests section.",
    placement: "bottomRight",
    key: "testNotification",
  });
};

const StudentProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({
    name: "",
    dob: "",
    email: "",
    class: "",
  });

  const getStudentTests = async () => {
    try {
      const response = await axios.get(
        `/api/Profile/student_tests/${user.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const filteredTests = response.data.filter((test) => test.state === -1);
      return filteredTests;
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      notification.error({
        message: "Failed to Load Tests",
        description: "There was an error while fetching test data.",
      });
    }
  };

  useEffect(() => {
    const fetchUserAndClassDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const userResponse = await axios.get(
          `/api/UserAuth/${user.role}/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userData = userResponse.data;

        const classResponse = await axios.get(
          `/api/Profile/student_class/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const classData = classResponse.data;

        setUserDetails({
          name: `${userData.first_Name} ${userData.last_Name} ${userData.patronymic_Name}`,
          dob: moment(userData.date_Of_Birth).format("DD.MM.YYYY"),
          email: userData.email,
          class: `${classData.number}-${classData.letter}`,
        });

        if (classData.id) {
          const assignments = await getAssignments(classData.id);
          const studentTests = await getStudentTests(user.id);
          if (assignments.length > 0 && studentTests.length > 0) {
            openNotification();
          }
        }
      } catch (error) {
        console.error("Failed to fetch user or class details:", error);
        notification.error({
          message: "Error Fetching Data",
          description: "Failed to fetch user or class details.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user.id && user.role) {
      fetchUserAndClassDetails();
    }
  }, [user.id, user.role]);

  const getAssignments = async (classId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/api/Profile/assignments_class/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      notification.error({
        message: "Error",
        description: "Failed to fetch assignments.",
      });
      return [];
    }
  };

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
            Student
          </div>
        </div>
      </div>
      <hr />
      <div>
        <h2 style={{ color: "gray", marginBottom: "20px" }}>Details</h2>
        <p>
          <b>Class</b>
          <br />
          {userDetails.class}
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

export default StudentProfile;
