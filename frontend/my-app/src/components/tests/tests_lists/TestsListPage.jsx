import React, { useState, useEffect } from "react";
import { List, Button, notification, Popconfirm, Spin, Select } from "antd";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import moment from "moment";
import "../../../styles/testsStyle.css";
import { useQuery, useMutation, useQueryClient } from "react-query";

const { Option } = Select;

const fetchTestsAndClasses = async (userId, token) => {
  const [testsResponse, classesResponse] = await Promise.all([
    axios.get(`/api/Tests/tests/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get(`/api/Profile/teachers_classes/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const testsWithAdditionalData = await Promise.all(
    testsResponse.data.map(async (test) => {
      const assignmentsResponse = await axios.get(
        `/api/Profile/assignments_test/${test.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return {
        ...test,
        key: test.id,
        subjectName: (
          await axios.get(`/api/Profile/subject/${test.subject_Id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).data.name,
        formattedDate: moment(test.date_Of_Creating).format("DD.MM.YYYY"),
        assignedClasses: assignmentsResponse.data.map((ac) => ac.class_Id),
      };
    })
  );

  return { tests: testsWithAdditionalData, classes: classesResponse.data };
};

const TestsListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const [selectedClasses, setSelectedClasses] = useState({});
  const [blockedClasses, setBlockedClasses] = useState({});

  const { data, isLoading, isError, error } = useQuery(
    ["testsData", user.id],
    () => fetchTestsAndClasses(user.id, token)
  );

  const { tests, classes } = data || { tests: [], classes: [] };

  const deleteMutation = useMutation(
    (testId) =>
      axios.delete(`/api/Tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["testsData", user.id]);
        notification.success({
          message: "Test Deleted",
          description: "The test has been successfully deleted.",
        });
      },
      onError: (err) => {
        notification.error({
          message: "Failed to Delete Test",
          description:
            err.response?.data?.message ||
            "An error occurred while deleting the test.",
        });
      },
    }
  );

  const assignMutation = useMutation(
    ({ testId, classId }) =>
      axios.post(
        `/api/Profile/assignment_test/${testId}/${classId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
    {
      onSuccess: (_, { testId, classId }) => {
        queryClient.invalidateQueries(["testsData", user.id]);
        setBlockedClasses((prev) => ({
          ...prev,
          [testId]: [...(prev[testId] || []), classId],
        }));
        notification.success({
          message: "Test Successfully Assigned",
        });
      },
      onError: (err) => {
        notification.error({
          message: "Assignment Failed",
          description:
            err.response?.data || "Failed to assign the test due to an error.",
        });
      },
    }
  );

  useEffect(() => {
    if (data && data.tests) {
      const initialSelectedClasses = {};
      data.tests.forEach((test) => {
        initialSelectedClasses[test.id] = selectedClasses[test.id] || "";
      });
      setSelectedClasses(initialSelectedClasses);

      const initialBlockedClasses = {};
      data.tests.forEach((test) => {
        initialBlockedClasses[test.id] = test.assignedClasses;
      });
      setBlockedClasses(initialBlockedClasses);
    }
  }, [data]);

  if (isLoading)
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
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="container mt-4">
      <h1>Tests List</h1>
      <hr />
      {tests && tests.length > 0 ? (
        <List
          itemLayout="horizontal"
          dataSource={tests}
          renderItem={(item) => (
            <List.Item
              actions={[
                <div key="select-container">
                  <Select
                    key="select"
                    className="tests-form"
                    style={{
                      width: "80px",
                      height: "35px",
                      marginRight: "5px",
                    }}
                    onChange={(value) => {
                      setSelectedClasses((prev) => ({
                        ...prev,
                        [item.id]: value,
                      }));
                    }}
                    value={selectedClasses[item.id]}
                  >
                    {classes.map((cls) => (
                      <Option
                        key={cls.id}
                        value={cls.id}
                        disabled={
                          item.assignedClasses.includes(cls.id) ||
                          (blockedClasses[item.id] &&
                            blockedClasses[item.id].includes(cls.id))
                        }
                      >
                        {`${cls.number}-${cls.letter}`}
                      </Option>
                    ))}
                  </Select>

                  <Button
                    style={{
                      fontSize: "16px",
                      height: "35px",
                      marginTop: "8px",
                    }}
                    onClick={() =>
                      assignMutation.mutate({
                        testId: item.id,
                        classId: selectedClasses[item.id],
                      })
                    }
                    type="primary"
                    ghost
                    disabled={!selectedClasses[item.id]}
                  >
                    Assign
                  </Button>
                </div>,

                <Button
                  key="edit"
                  type="default"
                  onClick={() => navigate(`/edit-test/${item.id}`)}
                  style={{
                    color: "orange",
                    borderColor: "orange",
                    fontSize: "16px",
                    height: "35px",
                  }}
                >
                  Edit
                </Button>,

                <Popconfirm
                  key="delete"
                  placement="topRight"
                  title={`Are you sure you want to delete ${item.name}?`}
                  onConfirm={() => deleteMutation.mutate(item.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="primary"
                    danger
                    style={{ fontSize: "16px", height: "35px" }}
                    ghost
                  >
                    Delete
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Link to={`/test-details/${item.id}`}>
                    <span style={{ fontSize: "18px" }}>{item.name}</span>
                  </Link>
                }
                description={
                  <span style={{ fontSize: "16px" }}>
                    <b>{"Subject: "}</b>
                    {item.subjectName}
                    <br />
                    <b>{"Date: "}</b>
                    {moment(item.date_Of_Creating).format("DD.MM.YYYY")}
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

export default TestsListPage;
