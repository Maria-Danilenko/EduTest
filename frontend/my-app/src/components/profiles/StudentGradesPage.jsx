import React, { useState, useEffect, useCallback } from "react";
import { Table, notification, Spin } from "antd";
import "../../styles/studentGradesStyle.css";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

const columns = [
  {
    title: <h5>Test's name</h5>,
    dataIndex: "testName",
    key: "testName",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => a.testName.localeCompare(b.testName),
  },
  {
    title: <h5>Subject</h5>,
    dataIndex: "subjectName",
    key: "subjectName",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => a.subjectName.localeCompare(b.subjectName),
  },
  {
    title: <h5>Passing Date</h5>,
    dataIndex: "formattedDate",
    key: "formattedDate",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => new Date(a.rawDate) - new Date(b.rawDate),
    defaultSortOrder: "descend",
  },
  {
    title: <h5>Grade</h5>,
    dataIndex: "score",
    key: "score",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => a.score - b.score,
  },
];

const StudentGradesPage = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const getAllStudentTests = useCallback(async () => {
    setLoading(true);
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
            formattedDate: moment(studTest.date_Time_Taken).format(
              "DD.MM.YYYY"
            ),
            rawDate: studTest.date_Time_Taken,
          };
        })
      );
      const filteredTests = testsWithSubjects.filter(
        (test) => test.state === 1
      );
      setTests(filteredTests);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      notification.error({
        message: "Failed to Load Tests",
        description: "There was an error while fetching test data.",
      });
    } finally {
      setLoading(false);
    }
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
          <h1>Grades</h1>
        </div>
      </div>
      <hr />
      <Table dataSource={tests} columns={columns} />
    </div>
  );
};

export default StudentGradesPage;
