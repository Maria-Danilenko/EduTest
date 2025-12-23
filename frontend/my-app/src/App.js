import React from "react";
import Header from "./components/main_elements/Header";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

import TestCreatingPage from "./components/tests/TestCreatingPage";
import TestTakingPage from "./components/tests/TestTakingPage";
import TestEditPage from "./components/tests/TestEditPage";
import StudentProfilePage from "./components/profiles/StudentProfilePage";
import TeacherProfilePage from "./components/profiles/TeacherProfilePage";
import TestsListPage from "./components/tests/tests_lists/TestsListPage";
import StudentGradesPage from "./components/profiles/StudentGradesPage";
import LoginPage from "./components/auth/LoginPage";
import RegistrationPage from "./components/auth/RegistrationPage";
import StudentTestsListPage from "./components/tests/tests_lists/StudentTestsListPage";
import TestDetailsPage from "./components/tests/tests_lists/TestDetailsPage";
import NotFoundPage from "./components/main_elements/NotFoundPage";
import AuthRedirect from "./components/main_elements/AuthRedirect";
import TeacherGradesPage from "./components/profiles/TeacherGradesPage";
import StudentPerformanceAnalysisPage from  "./components/profiles/StudentPerformanceAnalysisPage"

const queryClient = new QueryClient(); // Create a client

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Header />
        </div>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/create-test" element={<TestCreatingPage />} />
          <Route path="/take-test/:testId" element={<TestTakingPage />} />
          <Route path="/edit-test/:testId" element={<TestEditPage />} />
          <Route path="/grades" element={<StudentGradesPage />} />
          <Route path="/tests-list" element={<TestsListPage />} />
          <Route path="/student-profile/:id" element={<StudentProfilePage />} />
          <Route path="/teacher-profile/:id" element={<TeacherProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registration" element={<RegistrationPage />} />
          <Route path="/stud-tests-list" element={<StudentTestsListPage />} />
          <Route path="/test-details/:testId" element={<TestDetailsPage />} />
          <Route path="/teacher-grades" element={<TeacherGradesPage />} />
          <Route path="/student-performance" element={<StudentPerformanceAnalysisPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
