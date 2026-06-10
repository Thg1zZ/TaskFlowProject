import LoginClient from "./LoginClient";

export default function LoginPage() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  
  return <LoginClient clientId={clientId} />;
}
