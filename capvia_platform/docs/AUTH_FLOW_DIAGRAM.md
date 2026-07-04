# CAPVIA Authentication Flow Diagram

The following represents the unified user journey through the CAPVIA authentication ecosystem. The backend determines the role dynamically, keeping the frontend flow simplified.

```mermaid
graph TD
    Start((Start)) --> Login
    Start --> Register
    
    Login --> |Forgot Password?| ForgotPassword
    Login --> |Success| Dashboard
    
    ForgotPassword --> |Send Email| ResetPassword
    ResetPassword --> |Success| Login
    
    Register --> |Submit Form| VerifyEmail
    VerifyEmail --> |Verify Token| ProfileSetup
    
    ProfileSetup --> |Candidate Flow| ProfileSetupSubmit
    ProfileSetup --> |HR Flow| ProfileSetupSubmit
    
    ProfileSetupSubmit --> |Success| Dashboard
    
    Dashboard --> |Role: Candidate| CandidateApp
    Dashboard --> |Role: HR| HRApp
    Dashboard --> |Role: Admin| AdminApp
```

## Key Flows
1. **Registration Flow:** User fills out registration form -> Redirects to Verify Email -> Verifies -> Redirects to Profile Setup -> Redirects to Dashboard.
2. **Login Flow:** User enters credentials -> Authenticates -> Redirects to Dashboard (which routes based on backend Role).
3. **Recovery Flow:** Forgot Password -> Email sent -> Click link to Reset Password -> Login with new credentials.
