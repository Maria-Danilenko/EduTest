import React from "react";
import { Table, notification, Spin } from "antd";
import "../../styles/studentGradesStyle.css";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "react-query";
import moment from "moment";

const columns = [
  {
    title: <h5>Test's Name</h5>,
    dataIndex: "name",
    key: "name",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: <h5>Subject</h5>,
    dataIndex: "subjectName",
    key: "subjectName",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => a.subjectName.localeCompare(b.subjectName),
  },
  {
    title: <h5>Date Created</h5>,
    dataIndex: "formattedDate",
    key: "formattedDate",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => new Date(a.rawDate) - new Date(b.rawDate),
    defaultSortOrder: "descend",
  },
  {
    title: <h5>Max Score</h5>,
    dataIndex: "max_Score",
    key: "max_Score",
    render: (text) => <div style={{ fontSize: "16px" }}>{text}</div>,
    sorter: (a, b) => a.max_Score - b.max_Score,
  },
];

const fetchTests = async (userId, token) => {
  const response = await axios.get(`/api/Tests/tests/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const testsWithSubjects = await Promise.all(
    response.data.map(async (test) => {
      const subjectName = (
        await axios.get(`/api/Profile/subject/${test.subject_Id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data.name;

      const studentTests = await axios.get(
        `/api/Profile/student_tests_id/${test.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const studentsData = await Promise.all(
        studentTests.data.map(async (studentTest) => {
          const studentData = await getStudent(studentTest.student_Id, token);
          return {
            ...studentTest,
            studentFullName: studentData.fullName,
            key: studentTest.id,
          };
        })
      );

      return {
        ...test,
        key: test.id,
        subjectName,
        formattedDate: moment(test.date_Of_Creating).format("DD.MM.YYYY"),
        studentTests: studentsData,
        rawDate: test.date_Of_Creating,
      };
    })
  );
  return testsWithSubjects;
};

const getStudent = async (studentId, token) => {
  const response = await axios.get(`/api/Profile/student/${studentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    fullName: `${response.data.first_Name} ${response.data.last_Name} ${response.data.patronymic_Name}`,
  };
};

const TeacherGradesPage = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const {
    data: tests,
    isLoading,
    error,
  } = useQuery(["tests", user.id], () => fetchTests(user.id, token));

  const expandedRowRender = (record) => {
    const studentColumns = [
      {
        title: "Student name",
        dataIndex: "studentFullName",
        key: "student_Name",
        sorter: (a, b) => a.studentFullName.localeCompare(b.studentFullName),
      },
      {
        title: "Score",
        dataIndex: "score",
        key: "score",
        render: (score) => score || "N/A",
        sorter: (a, b) => a.score - b.score,
      },
      {
        title: "Date Taken",
        dataIndex: "date_Time_Taken",
        key: "date_Taken",
        render: (date) => (date ? moment(date).format("DD.MM.YYYY") : "N/A"),
        sorter: (a, b) =>
          new Date(a.date_Time_Taken) - new Date(b.date_Time_Taken),
      },
      {
        title: "Time Taken",
        dataIndex: "date_Time_Taken",
        key: "time_Taken",
        render: (date) => (date ? moment(date).format("HH:mm") : "N/A"),
      },
      {
        title: "State",
        dataIndex: "state",
        key: "state",
        sorter: (a, b) => a.state - b.state,
        render: (state) => {
          switch (state) {
            case 1:
              return "Completed";
            case 0:
              return "In process";
            case -1:
              return "Not Completed";
            default:
              return "Unknown";
          }
        },
      },
    ];

    return (
      <Table
        columns={studentColumns}
        dataSource={record.studentTests}
        pagination={false}
      />
    );
  };

  if (isLoading) {
    return (
      <Spin
        size="large"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      />
    );
  }

  if (error) {
    notification.error({
      message: "Failed to Load Tests",
      description: "There was an error while fetching test data.",
    });
    return null;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <div>
          <h1>Tests Grades</h1>
        </div>
      </div>
      <hr />
      <Table
        columns={columns}
        expandable={{ expandedRowRender }}
        dataSource={tests}
        rowKey="id"
      />
    </div>
  );
};

export default TeacherGradesPage;
