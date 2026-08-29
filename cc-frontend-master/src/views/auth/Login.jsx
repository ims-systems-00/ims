import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Form,
  Input,
  InputGroup,
  InputGroupText,
} from "@ims-systems-00/ims-ui-kit";
import { useLogin } from "./hooks/useLogin";
import { useForm } from "@ims-systems-00/ims-react-hooks";
import * as yup from "yup";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { RxRocket } from "react-icons/rx";
import logo from "images/logo.png";
import brandConfig from "config.js";

// Login form validation schema
const loginFormValidationSchema = yup.object().shape({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

// Default form state
const getLoginFormState = () => ({
  email: "",
  password: "",
});

function Login() {
  const { handleLogin } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    dataModel,
    validationErrors,
    handleChange,
    handleSubmit,
    isBusy,
    isFormValid,
  } = useForm(getLoginFormState(), loginFormValidationSchema);

  const onSubmit = async (e) => {
    try {
      await handleSubmit(e, async (formData) => {
        await handleLogin(formData);
      });
    } catch (error) {
      // Error is already handled by the form hook and useLogin
      console.error("Form submission error:", error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Container>
        <Row>
          <Col md="5" lg="4" className="mx-auto">
            <div className="text-center mb-4">
              <h2 className="mb-3">
                <img
                  style={{ height: 30 }}
                  className="img-fluid mx-auto me-2"
                  src={logo}
                  alt="logo"
                />{" "}
                {brandConfig.brandName}
              </h2>
            </div>

            <Card className="border rounded-3 shadow-none">
              <CardBody className="p-4">
                <h4 className="text-center mb-4">Login</h4>

                <Form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={dataModel.email}
                      onChange={(changes) =>
                        handleChange({
                          field: "email",
                          value: changes.currentTarget.value,
                        })
                      }
                      className={validationErrors.email ? "is-invalid" : ""}
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback">
                        {validationErrors.email}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Password</label>
                    <InputGroup>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={dataModel.password}
                        onChange={(changes) =>
                          handleChange({
                            field: "password",
                            value: changes.currentTarget.value,
                          })
                        }
                        className={
                          validationErrors.password ? "is-invalid" : ""
                        }
                      />
                      <InputGroupText
                        className="cursor-pointer"
                        onClick={togglePasswordVisibility}
                        style={{ cursor: "pointer" }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </InputGroupText>
                      {validationErrors.password && (
                        <div className="invalid-feedback">
                          {validationErrors.password}
                        </div>
                      )}
                    </InputGroup>
                  </div>

                  <Button
                    type="submit"
                    color="primary"
                    className="w-100 mb-3"
                    disabled={!isFormValid() || isBusy}
                  >
                    {isBusy ? "Logging in..." : "Login"}
                  </Button>

                  <div className="text-center">
                    <p className="mb-2">Don't have an account?</p>
                    <Button
                      color="primary"
                      outline
                      className="w-100"
                      onClick={() =>
                        window.location.replace(
                          process.env.REACT_APP_IMS_CLIENT_URL +
                            "/auth/register"
                        )
                      }
                    >
                      Sign up <RxRocket />
                    </Button>
                  </div>
                </Form>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Login;
