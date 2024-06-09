import React, { useState, useCallback, useEffect } from "react";
import { List, Button, Popconfirm, notification, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import moment from "moment";
import "../../../styles/testsStyle.css";

const StudentTestsListPage = () => {
  const [tests, setTests] = useState([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getAllStudentTests = useCallback(async () => {
    setLoading(true);
    let testDataToReturn = [];
    try {
      const response = await axios.get(
        `/api/Profile/student_tests/${user.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const testsWithSubjects = await Promise.all(
        response.data.map(async (studTest) => {
          const testData = await getTest(studTest.test_Id);
          const subjectName = await getSubject(testData.subject_Id);
          return {
            ...studTest,
            key: studTest.id,
            subjectName,
            testName: testData.name,
            formattedDate: moment(testData.date_Of_Creating).format(
              "DD.MM.YYYY"
            ),
          };
        })
      );
      const filteredTests = testsWithSubjects.filter(test => test.state === -1);
      setTests(filteredTests);
      testDataToReturn = testsWithSubjects;
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      notification.error({
        message: "Failed to Load Tests",
        description: "There was an error while fetching test data.",
      });
    } finally {
      setLoading(false);
    }
    return testDataToReturn;
  }, [user.id]);

  async function getTest(testId) {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/Tests/test/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch test:", error);
      notification.error({
        message: "Failed to Fetch Test",
        description: "There was an error while fetching the test.",
      });
      return {};
    }
  }

  async function getSubject(id) {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/Profile/subject/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.name;
    } catch (error) {
      console.error("Failed to fetch subject:", error);
      notification.error({
        message: "Failed to Load Subject",
        description: "There was an error while fetching subject data.",
      });
      return "Unknown";
    }
  }

  useEffect(() => {
    getAllStudentTests();
  }, [getAllStudentTests]);

  const handleTakeTest = (testId) => {
    navigate(`/take-test/${testId}`);
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
      <h1>Available Tests</h1>
      <hr />
      {tests.length > 0 ? (
        <List
          itemLayout="horizontal"
          dataSource={tests}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm
                  placement="topRight"
                  title={`Are you sure you want to take this test?`}
                  onConfirm={() => handleTakeTest(item.test_Id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="primary"
                    style={{ fontSize: "16px", height: "35px" }}
                  >
                    Take Test
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span style={{ fontSize: "18px" }}>{item.testName}</span>
                }
                description={
                  <span style={{ fontSize: "16px" }}>
                    <b>{"Subject: "}</b>
                    {item.subjectName}
                    <br />
                    <b>{"Date: "}</b>
                    {item.formattedDate}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <div>No tests data</div>
      )}
    </div>
  );
};

export default StudentTestsListPage;
