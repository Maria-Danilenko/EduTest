import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  notification,
} from "antd";
import "../../styles/registrationStyle.css";
import axios from "axios";
import moment from "moment";
import { useAuth } from "../../context/AuthContext";

const { Option } = Select;

const RegistrationPage = () => {
  const [form] = Form.useForm();
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    axios
      .get("/api/Profile/subject")
      .then((response) => {
        setSubjects(response.data);
      })
      .catch((error) => {
        console.error("Failed to fetch subjects:", error);
      });

    if (user && user.id && user.role) {
      notification.success({
        message: "Login Successful",
        description: "You have been automatically logged in.",
      });
      navigate(`/${user.role}-profile/${user.id}`);
    }
  }, [user, navigate]);

  const onFinish = async (values) => {
    const dataToSend = {
      firstName: values.firstName,
      lastName: values.lastName,
      patronymicName: values.patronymic || "",
      email: values.email,
      dateOfBirth: values.dob.format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
      password: values.password,
      role: values.role,
      subjects: values.role === "teacher" ? values.subjects : [],
      classNumber:
        values.role === "student" ? parseInt(values.class.number) : null,
      classLetter: values.role === "student" ? values.class.letter : null,
      lastLogin: moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
    };

    try {
      await axios.post("api/UserAuth/register", dataToSend, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const loginResult = await login({
        email: values.email,
        password: values.password,
      });

      if (!loginResult.success) {
        notification.error({
          message: "Auto-Login Failed",
          description:
            loginResult.error || "An error occurred during auto-login.",
        });
      }
    } catch (error) {
      console.error("Failed to register:", error);
      notification.error({
        message: "Registration Failed",
        description:
          error.response?.data || "An error occurred during registration.",
      });
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ marginTop: "25px" }}
    >
      <Form
        layout="vertical"
        form={form}
        name="register"
        onFinish={onFinish}
        scrollToFirstError
        style={{ maxWidth: "400px", width: "100%" }}
        className="registration-form"
      >
        <h1 className="text-center mb-4">Registration</h1>

        <Form.Item
          name="firstName"
          label="First Name"
          rules={[{ required: true, message: "Please input your first name!" }]}
        >
          <Input placeholder="First Name" />
        </Form.Item>
        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[{ required: true, message: "Please input your last name!" }]}
        >
          <Input placeholder="Last Name" />
        </Form.Item>
        <Form.Item name="patronymic" label="Patronymic">
          <Input placeholder="Patronymic (Optional)" />
        </Form.Item>

        <Form.Item
          name="dob"
          label="Date of Birth"
          rules={[
            { required: true, message: "Please input your date of birth!" },
          ]}
        >
          <DatePicker style={{ width: "100%" }} placeholder="Date of Birth" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { type: "email", message: "The input is not valid E-mail!" },
            { required: true, message: "Please input your E-mail!" },
          ]}
        >
          <Input placeholder="Email" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please input your password!" },
            { min: 6, message: "Password must be at least 6 characters long!" },
          ]}
          hasFeedback
        >
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          dependencies={["password"]}
          hasFeedback
          rules={[
            { required: true, message: "Please confirm your password!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("The two passwords that you entered do not match!")
                );
              },
            }),
          ]}
        >
          <Input.Password placeholder="Confirm Password" />
        </Form.Item>

        <hr style={{ marginTop: "25px" }} />

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: "Please select your role!" }]}
        >
          <Select placeholder="Select Role" onChange={setUserRole}>
            <Option value="teacher">Teacher</Option>
            <Option value="student">Student</Option>
          </Select>
        </Form.Item>

        {userRole === "teacher" && (
          <Form.Item
            name="subjects"
            label="Subjects"
            rules={[
              { required: true, message: "Please select at least one subject" },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select subjects"
              optionLabelProp="label"
            >
              {subjects.map((subject) => (
                <Option
                  key={subject.id}
                  value={subject.id}
                  label={subject.name}
                >
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {userRole === "student" && (
          <Space className="d-flex justify-content-between">
            <Form.Item
              name={["class", "number"]}
              rules={[{ required: true, message: "Class number required" }]}
            >
              <Input placeholder="Class number" type="number" />
            </Form.Item>
            <Form.Item
              name={["class", "letter"]}
              rules={[{ required: true, message: "Class letter required" }]}
            >
              <Input placeholder="Class letter" maxLength={1} />
            </Form.Item>
          </Space>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            style={{ fontSize: "16px", height: "35px" }}
          >
            Register
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegistrationPage;
