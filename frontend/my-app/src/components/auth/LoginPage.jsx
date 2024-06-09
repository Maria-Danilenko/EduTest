import React, { useEffect } from "react";
import { Form, Input, Button, Card, notification } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(`/${user.role}-profile/${user.id}`);
    }
  }, [user, navigate]);

  const onFinish = async (values) => {
    try {
      const result = await login(values);
      if (!result.success) {
        const errorMessage =
          typeof result.error === "object"
            ? result.error.message
            : result.error;
        notification.error({
          message: "Login Failed",
          description: errorMessage || "An error occurred during login.",
        });
      }
    } catch (error) {
      console.error("Unexpected error in login:", error);
      notification.error({
        message: "Login Exception",
        description: "An unexpected error occurred. Please try again later.",
      });
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ height: "85vh" }}
    >
      <Card style={{ width: "400px", borderColor: "#c4c4c4" }}>
        <h3 style={{ marginBottom: "20px" }}>Log in</h3>
        <Form
          name="basic"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Email is not a valid!" },
            ]}
          >
            <Input placeholder="Email" style={{ fontSize: "16px" }} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              placeholder="Password"
              style={{ fontSize: "16px" }}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              style={{ fontSize: "16px", height: "35px" }}
              loading={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: "center", marginBottom: "0" }}>
            <Link to="/registration">
              {" "}
              <Button type="link" htmlType="button">
                Sign up
              </Button>
            </Link>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
