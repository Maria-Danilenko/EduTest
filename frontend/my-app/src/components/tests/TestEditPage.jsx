import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  InputNumber,
  Card,
  notification,
  Spin,
  Radio,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import "../../styles/testsStyle.css";
import { useAuth } from "../../context/AuthContext";

const { Option } = Select;
const { TextArea } = Input;

function TestEditingPage() {
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { testId } = useParams();
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subjectsResponse, questionTypesResponse, testResponse] =
        await Promise.all([
          axios.get("/api/Profile/subject"),
          axios.get("/api/Tests/question_types"),
          axios.get(`/api/Tests/get_test/${testId}`),
        ]);

      const subjects = subjectsResponse.data;
      const questionTypes = questionTypesResponse.data.map((qt) => ({
        ...qt,
        key: qt.id,
      }));
      const data = testResponse.data;

      const questionsWithCorrectAnswers = data.questions.map((question) => {
        const correctAnswerIndex = question.variants.findIndex(
          (variant) => variant.isCorrect
        );

        return {
          ...question,
          questionId: question.id,
          correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : null,
          variants: question.variants.map((variant) => ({
            ...variant,
            variantId: variant.id,
          })),
        };
      });

      form.setFieldsValue({
        testName: data.testName,
        description: data.description,
        isTimeLimitEnabled: data.isTimeLimitEnabled,
        duration: data.duration,
        subjectId: data.subjectId,
        questions: questionsWithCorrectAnswers,
      });

      setSubjects(subjects);
      setQuestionTypes(questionTypes);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";
      notification.error({
        message: "Fetching Error",
        description: `Failed to fetch data: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [testId, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isFormValid = (questions) => {
    return questions.every((question) => {
      return (
        question.questionTypeId === 3 ||
        (question.variants && question.variants.length > 0)
      );
    });
  };

  const onFinish = (values) => {
    if (values.questions.length === 0) {
      notification.error({
        message: "Validation Error",
        description: "The test must contain at least one question.",
      });
      return;
    }

    if (!isFormValid(values.questions)) {
      notification.error({
        message: "Validation Error",
        description:
          "Every question (except open-ended) must have at least one answer option.",
      });
      return;
    }

    values.isTimeLimitEnabled = values.isTimeLimitEnabled ?? false;
    let maxScore = 0;
    const teacherId = parseInt(user.id);

    const questionsWithTypeId = values.questions.map((question) => {
      let variants =
        question.questionTypeId === 3
          ? []
          : question.variants?.map((variant) => ({
              ...variant,
              isCorrect: !!variant.isCorrect,
            })) || [];

      if (question.questionTypeId === 1) {
        const correctAnswerIndex = question.correctAnswer;

        variants = variants.map((variant, idx) => ({
          ...variant,
          isCorrect: idx === correctAnswerIndex,
        }));
      }

      maxScore += question.marks;

      return {
        ...question,
        variants,
        questionType: undefined,
      };
    });

    const transformedValues = {
      ...values,
      questions: questionsWithTypeId,
      maxScore,
      teacherId,
      id: testId,
    };

    axios
      .post(`/api/Tests/update_test/`, transformedValues, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then(() => {
        notification.success({ message: "Test Updated Successfully" });
        navigate("/tests-list");
      })
      .catch((error) => {
        const data = error.response?.data;
        let description = "An error occurred during test updating.";

        if (typeof data === "string") {
          description = data;
        } else if (data && data.errors) {
          const messages = Object.values(data.errors).flat();
          description = messages.join(" ");
        } else if (data && (data.title || data.detail)) {
          description = `${data.title ?? ""} ${data.detail ?? ""}`.trim();
        } else if (error.message) {
          description = error.message;
        }

        notification.error({
          message: "Test Updating Failed",
          description,
        });
      });
  };

  if (isLoading) {
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
    <div className="container mt-4 tests-form">
      <h1 className="mb-3">Test Editing</h1>
      <hr />
      <h2 className="text-center mb-3">Test Details</h2>
      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        name="test-editing-form"
      >
        <Form.Item
          name="testName"
          label="Test Name"
          rules={[{ required: true, message: "Please input the test name!" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea />
        </Form.Item>
        <div className="d-flex">
          <Form.Item
            name="isTimeLimitEnabled"
            valuePropName="checked"
            label="Duration (in minutes)"
            style={{ marginBottom: "30px" }}
          >
            <Checkbox>Time limit</Checkbox>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.isTimeLimitEnabled !== currentValues.isTimeLimitEnabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("isTimeLimitEnabled") && (
                <Form.Item
                  name="duration"
                  label="&nbsp;"
                  rules={[
                    { required: true, message: "Please input the duration!" },
                  ]}
                >
                  <InputNumber min={1} />
                </Form.Item>
              )
            }
          </Form.Item>
        </div>

        <Form.Item
          name="subjectId"
          label="Subject"
          rules={[{ required: true, message: "Please select a subject!" }]}
        >
          <Select placeholder="Select a subject" style={{ height: "35px" }}>
            {subjects.map((subject) => (
              <Option key={subject.id} value={subject.id}>
                {subject.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <br />
        <h2 className="text-center mb-3">Test Questions</h2>

        <Form.List name="questions">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...fieldRest }) => (
                <Card
                  key={key}
                  style={{ marginBottom: "16px", borderColor: "#c4c4c4" }}
                >
                  <div className="d-flex" style={{ marginBottom: "16px" }}>
                    <Form.Item
                      {...fieldRest}
                      name={[name, "questionText"]}
                      label={`${key + 1}. Question Text`}
                      rules={[
                        { required: true, message: "Missing question text" },
                      ]}
                      style={{ width: "100%", margin: "0px 15px 5px 0px" }}
                    >
                      <TextArea placeholder="Question Text" />
                    </Form.Item>

                    <Form.Item
                      {...fieldRest}
                      name={[name, "marks"]}
                      rules={[{ required: true, message: "Missing marks" }]}
                      label="Marks"
                      style={{ marginRight: "15px", height: "35px" }}
                      className="align-self-top"
                    >
                      <InputNumber min={0} placeholder="Marks" />
                    </Form.Item>

                    <Form.Item
                      {...fieldRest}
                      name={[name, "questionTypeId"]}
                      rules={[
                        { required: true, message: "Missing question type" },
                      ]}
                      label="Question Type"
                      style={{ marginRight: "15px" }}
                    >
                      <Select
                        placeholder="Select a question type"
                        style={{ height: "35px", width: "155px" }}
                      >
                        {questionTypes.map((qt) => (
                          <Option key={qt.id} value={qt.id}>
                            {qt.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Button
                      type="primary"
                      danger
                      onClick={() => remove(name)}
                      style={{ height: "35px", marginTop: "35px" }}
                      className="align-self-top"
                    >
                      Delete
                    </Button>
                  </div>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, curValues) =>
                      prevValues.questions?.[name]?.questionTypeId !==
                      curValues.questions?.[name]?.questionTypeId
                    }
                  >
                    {({ getFieldValue }) => {
                      const questionType = getFieldValue([
                        "questions",
                        name,
                        "questionTypeId",
                      ]);

                      return (
                        questionType &&
                        questionType !== 3 && (
                          <Form.List name={[name, "variants"]}>
                            {(
                              variantFields,
                              { add: addVariant, remove: removeVariant }
                            ) => (
                              <>
                                {variantFields.map(
                                  (variantField, variantIndex) => (
                                    <div
                                      key={variantField.key}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        width: "auto",
                                      }}
                                    >
                                      <Form.Item
                                        {...variantField}
                                        name={[
                                          variantField.name,
                                          "variantText",
                                        ]}
                                        key={[variantField.key, "variantText"]}
                                        rules={[
                                          {
                                            required: true,
                                            message: "Missing variant text",
                                          },
                                        ]}
                                        label={`${
                                          variantIndex + 1
                                        }. Variant Text`}
                                        style={{ flex: 1, marginRight: "10px" }}
                                      >
                                        <Input style={{ width: "100%" }} />
                                      </Form.Item>

                                      {questionType === 1 && (
                                        <Form.Item
                                          name={[name, "correctAnswer"]}
                                          style={{ margin: "10px 0px 0px 5px" }}
                                        >
                                          <Radio.Group>
                                            <Radio value={variantIndex}>
                                              Is Correct
                                            </Radio>
                                          </Radio.Group>
                                        </Form.Item>
                                      )}

                                      {questionType === 2 && (
                                        <Form.Item
                                          name={[
                                            variantField.name,
                                            "isCorrect",
                                          ]}
                                          valuePropName="checked"
                                          style={{ margin: "10px 8px 0px 5px" }}
                                        >
                                          <Checkbox>Is Correct</Checkbox>
                                        </Form.Item>
                                      )}

                                      {questionType === 4 && (
                                        <Form.Item
                                          {...variantField}
                                          name={[
                                            variantField.name,
                                            "answerText",
                                          ]}
                                          key={[variantField.key, "answerText"]}
                                          rules={[
                                            {
                                              required: true,
                                              message: "Missing answer text",
                                            },
                                          ]}
                                          label="Answer Text"
                                          style={{
                                            flex: 1,
                                            marginRight: "10px",
                                          }}
                                        >
                                          <Input style={{ width: "100%" }} />
                                        </Form.Item>
                                      )}

                                      <Button
                                        type="primary"
                                        danger
                                        onClick={() =>
                                          removeVariant(variantIndex)
                                        }
                                        style={{
                                          margin: "10px 0px 0px 0px",
                                          height: "35px",
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )
                                )}
                                <Button
                                  type="dashed"
                                  onClick={() => addVariant()}
                                  icon={<PlusOutlined />}
                                  style={{ marginTop: "10px" }}
                                >
                                  Add Variant
                                </Button>
                              </>
                            )}
                          </Form.List>
                        )
                      );
                    }}
                  </Form.Item>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
              >
                Add Question
              </Button>
            </>
          )}
        </Form.List>
        <Form.Item style={{ display: "flex", justifyContent: "center" }}>
          <Button type="primary" htmlType="submit" style={{ height: "35px" }}>
            Save Test
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default TestEditingPage;
