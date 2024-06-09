import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "antd";


export default function Header() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <nav className="navbar navbar-light bg-light px-3">
      <div className="d-flex">
        <p className="navbar-brand p-2">EduTest</p>
        <ul className="navbar-nav list-group-horizontal fs-5">
          {isAuthenticated ? (
            user.role === "student" ? (
              <>
                <li className="nav-item active mx-3">
                  <Link className="nav-link" to="/grades">
                    Grades
                  </Link>
                </li>
                <li className="nav-item mx-3">
                  <Link className="nav-link" to="/stud-tests-list">
                    Tests
                  </Link>
                </li>
                <li className="nav-item mx-3">
                  <Link
                    className="nav-link"
                    to={`/student-profile/${user?.id}`}
                  >
                    Profile
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item active mx-3">
                  <Link className="nav-link" to="/teacher-grades">
                    Tests Grades
                  </Link>
                </li>
                <li className="nav-item mx-3">
                  <Link className="nav-link" to="/tests-list">
                    Tests List
                  </Link>
                </li>
                <li className="nav-item mx-3">
                  <Link className="nav-link" to="/create-test">
                    Creating Tests
                  </Link>
                </li>
                <li className="nav-item mx-3">
                  <Link
                    className="nav-link"
                    to={`/teacher-profile/${user?.id}`}
                  >
                    Profile
                  </Link>
                </li>
              </>
            )
          ) : null}
        </ul>
      </div>
      <form className="form-inline">
        {isAuthenticated ? (
          <Link to="/login">
            <Button  danger style={{height: "35px", fontSize: "16px"}} onClick={logout}>
              Logout
            </Button>
          </Link>
        ) : (
          <>
            <Link to="/login">
              <Button style={{marginRight: "10px", height: "35px", fontSize: "16px"}}>
                Login
              </Button>
            </Link>
            <Link to="/registration">
              <Button type="primary" style={{height: "35px", fontSize: "16px"}}>
                Sign Up
              </Button>
            </Link>
          </>
        )}
      </form>
    </nav>
  );
}
