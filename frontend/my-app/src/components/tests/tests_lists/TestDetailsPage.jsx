// import React, { useState, useEffect } from "react";
// import { List, Button, notification, Spin, InputNumber, Form } from "antd";
// import { useParams } from "react-router-dom";
// import axios from "axios";

// const TestDetailsPage = () => {
//   const { testId } = useParams();
//   const [testDetails, setTestDetails] = useState({
//     name: "",
//     studentTests: [],
//   });
//   const [loading, setLoading] = useState(true);
//   const [disabledStates, setDisabledStates] = useState({});
//   const [form] = Form.useForm();

//   const updateDisabledState = (questionId) => {
//     setDisabledStates((prevStates) => ({
//       ...prevStates,
//       [questionId]: true,
//     }));
//   };

//   const fetchTestDetails = async () => {
//     try {
//       const testResponse = await axios.get(`/api/Tests/test/${testId}`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//       });
//       const test = testResponse.data;

//       const studentTestsResponse = await axios.get(
//         `/api/Profile/student_tests_id/${testId}`,
//         {
//           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//         }
//       );

//       let fetchedStudentTests = await Promise.all(
//         studentTestsResponse.data.map(async (studentTest) => {
//           const studentDataResponse = await axios.get(
//             `/api/Profile/student/${studentTest.student_Id}`,
//             {
//               headers: {
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
//               },
//             }
//           );
//           studentTest.studentDetails = studentDataResponse.data;

//           const openQuestionsResponse = await axios.get(
//             `/api/Tests/student_open_questions/${studentTest.id}`,
//             {
//               headers: {
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
//               },
//             }
//           );

//           studentTest.openQuestions = await Promise.all(
//             openQuestionsResponse.data.map(async (question) => {
//               const questionDataResponse = await axios.get(
//                 `/api/Tests/question/${question.question_Id}`,
//                 {
//                   headers: {
//                     Authorization: `Bearer ${localStorage.getItem("token")}`,
//                   },
//                 }
//               );
//               question.questionDetails = questionDataResponse.data;
//               return question;
//             })
//           );
//           return studentTest;
//         })
//       );

//       const filteredStudentTests = fetchedStudentTests.filter(studentTest =>
//         studentTest.state === 0 ||
//         (studentTest.state === 1 && studentTest.openQuestions.some(q => q.score != null))
//       );

//       setTestDetails({ name: test.name, studentTests: filteredStudentTests });
//       setLoading(false);
//     } catch (error) {
//       console.error("Failed to fetch test details:", error);
//       notification.error({
//         message: "Failed to Load Data",
//         description: "There was an error while fetching the test details.",
//       });
//     }
//   };

//   const handleAssessment = async (questionId, studentTestId) => {
//     try {
//       const values = await form.validateFields([`score_${questionId}`]);
//       const score = values[`score_${questionId}`];

//       const responseOpenQuestion = await axios.post(
//         `/api/Tests/update_open_question_score/${questionId}`,
//         score,
//         {
//           withCredentials: true,
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//         }
//       );

//       const responseStudentTest = await axios.post(
//         `/api/Tests/update_student_test/${studentTestId}`,
//         score,
//         {
//           withCredentials: true,
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//         }
//       );

//       if (responseOpenQuestion.status === 200 && responseStudentTest.status === 200) {
//         notification.success({
//           message: "Saving Successfully Complete",
//         });
//         updateDisabledState(questionId, true);
//       }
//     } catch (error) {
//       notification.error({
//         message: "Saving Failed",
//         description:
//           error.response?.data.message ||
//           "Failed to save the score due to an error.",
//       });
//     }
//   };

//   useEffect(() => {
//     fetchTestDetails();
//   }, [testId]);

//   if (loading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           height: "80vh",
//         }}
//       >
//         <Spin size="large" />
//       </div>
//     );
//   }

//   return (
//     <div className="container mt-4">
//       <h1>Test "{testDetails.name}" Answers</h1>
//       <hr />
//       <Form form={form} layout="inline" onFinish={handleAssessment}>
//         <List
//           itemLayout="horizontal"
//           locale={{ emptyText: "There are no answers" }}
//           dataSource={testDetails.studentTests}
//           renderItem={(studentTest) => (
//             <List.Item>
//               <div>
//                 <h4>
//                   {studentTest.studentDetails?.first_Name}{" "}
//                   {studentTest.studentDetails?.last_Name}{" "}
//                   {studentTest.studentDetails?.patronymic_Name}
//                 </h4>
//                 {studentTest.openQuestions.length > 0 ? (
//                   studentTest.openQuestions.map((question) => (
//                     <div key={question.id}>
//                       <p>
//                         <b>Question:</b> {question.questionDetails.text}
//                         <br />
//                         <b>Max marks:</b> {question.questionDetails.marks}
//                       </p>
//                       <p style={{ fontSize: "16px" }}>
//                         <b>Answer:</b> {question.text}
//                       </p>
//                       <div style={{ display: "flex" }}>
//                         <div style={{ width: "81px", marginRight: "10px" }}>
//                           <Form.Item
//                             name={`score_${question.id}`}
//                             rules={[
//                               {
//                                 required: true,
//                                 message: (
//                                   <p
//                                     style={{
//                                       fontSize: "12px",
//                                       textAlign: "center",
//                                       width: "80px",
//                                     }}
//                                   >
//                                     Please enter the score!
//                                   </p>
//                                 ),
//                               },
//                             ]}
//                           >
//                             <InputNumber
//                               disabled={
//                                 disabledStates[question.id] ||
//                                 question.score != null
//                               }
//                               type="number"
//                               placeholder={
//                                 disabledStates[question.id] ||
//                                 question.score != null
//                                   ? question.score
//                                   : "Score"
//                               }
//                               min={0}
//                               max={question.questionDetails.marks}
//                               style={{
//                                 width: "81px",
//                                 height: "35px",
//                                 fontSize: "16px",
//                               }}
//                             />
//                           </Form.Item>
//                         </div>
//                         <Button
//                           type="primary"
//                           onClick={() => {
//                             form
//                               .validateFields([`score_${question.id}`])
//                               .then((values) => {
//                                 handleAssessment(
//                                   question.id,
//                                   studentTest.id,
//                                   values
//                                 );
//                               })
//                               .catch((info) => {});
//                           }}
//                           disabled={
//                             disabledStates[question.id] ||
//                             question.score != null
//                           }
//                           style={{ fontSize: "16px", height: "35px" }}
//                         >
//                           Submit
//                         </Button>
//                       </div>
//                     </div>
//                   ))
//                 ) : (
//                   <p>There are no answers.</p>
//                 )}
//               </div>
//             </List.Item>
//           )}
//         />
//       </Form>
//     </div>
//   );
// };

// export default TestDetailsPage;

import React from "react";
import { List, Button, notification, Spin, InputNumber, Form } from "antd";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";

const TestDetailsPage = () => {
  const { testId } = useParams();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const fetchTestDetails = async () => {
    const testResponse = await axios.get(`/api/Tests/test/${testId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const test = testResponse.data;

    const studentTestsResponse = await axios.get(
      `/api/Profile/student_tests_id/${testId}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );

    const studentTests = await Promise.all(
      studentTestsResponse.data.map(async (studentTest) => {
        const studentResponse = await axios.get(
          `/api/Profile/student/${studentTest.student_Id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const openQuestionsResponse = await axios.get(
          `/api/Tests/student_open_questions/${studentTest.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const openQuestions = await Promise.all(
          openQuestionsResponse.data.map(async (question) => {
            const questionDetailsResponse = await axios.get(
              `/api/Tests/question/${question.question_Id}`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
            return {
              ...question,
              questionDetails: questionDetailsResponse.data,
            };
          })
        );

        return {
          ...studentTest,
          studentFullName: `${studentResponse.data.first_Name} ${studentResponse.data.last_Name} ${studentResponse.data.patronymic_Name}`,
          openQuestions,
        };
      })
    );

    return { ...test, studentTests };
  };

  const {
    data: testDetails,
    isLoading,
    isError,
    error,
  } = useQuery(["testDetails", testId], fetchTestDetails, {
    staleTime: 1000 * 60 * 5,
  });

  const updateScoreMutation = useMutation(
    async ({ questionId, studentTestId, score }) => {
      await axios.post(
        `/api/Tests/update_open_question_score/${questionId}`,
        score,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      await axios.post(
        `/api/Tests/update_student_test/${studentTestId}`,
        score,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["testDetails", testId]);
        notification.success({ message: "Score Updated Successfully" });
      },
      onError: (error) => {
        notification.error({
          message: "Update Failed",
          description:
            error.response?.data.message ||
            "Failed to update score due to an error.",
        });
      },
    }
  );

  const handleAssessment = (questionId, studentTestId, score) => {
    updateScoreMutation.mutate({ questionId, studentTestId, score });
  };

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
      <h1>Test "{testDetails?.name}" Answers</h1>
      <hr />
      <Form form={form} layout="inline">
        <List
          itemLayout="horizontal"
          locale={{ emptyText: "There are no answers" }}
          dataSource={testDetails?.studentTests}
          renderItem={(studentTest) => (
            <List.Item>
              <div>
                <h4>{`${studentTest.studentFullName}`}</h4>
                {studentTest.openQuestions.map((question) => (
                  <Form.Item key={question.id}>
                    <div>
                      <p style={{ margin: "0px" }}>
                        <b style={{color: "#00000073"}}>Question:</b> {question.questionDetails.text}
                      </p>
                      <p style={{ marginBottom: "10px" }}>
                        <b style={{color: "#00000073"}}>Max Marks:</b> {question.questionDetails.marks}
                      </p>
                      <p style={{ fontSize: "16px" }}>
                        <b style={{color: "#00000073"}}>Answer:</b> {question.text}
                      </p>
                      <div style={{ display: "flex" }}>
                        <Form.Item
                          name={`score_${question.id}`}
                          rules={[
                            {
                              required: true,
                              message: "Please enter the score!",
                            },
                          ]}
                        >
                          <InputNumber
                            // rules={[
                            //   {
                            //     required: true,
                            //     message: (
                            //       <p
                            //         style={{
                            //           fontSize: "12px",
                            //           textAlign: "center",
                            //           width: "80px",
                            //         }}
                            //       >
                            //         Please enter the score!
                            //       </p>
                            //     ),
                            //   },
                            // ]}
                            disabled={question.score != null}
                            type="number"
                            placeholder={
                              question.score != null ? question.score : "Score"
                            }
                            min={0}
                            max={question.questionDetails.marks}
                            style={{
                              width: "81px",
                              height: "35px",
                              fontSize: "16px",                              
                            }}
                          />
                        </Form.Item>
                        <Button
                          style={{ fontSize: "16px", height: "35px" }}
                          type="primary"
                          onClick={() =>
                            handleAssessment(
                              question.id,
                              studentTest.id,
                              form.getFieldValue(`score_${question.id}`)
                            )
                          }
                          disabled={question.score != null}
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </Form.Item>
                ))}
              </div>
            </List.Item>
          )}
        />
      </Form>
    </div>
  );
};

export default TestDetailsPage;
