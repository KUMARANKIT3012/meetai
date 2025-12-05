import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

const page = () => {
  return <SignInView/>
}

export default page;

// http://localhost:3001/sign-in

// Note - thats how u create nested routes 
// Note - check layout.tsx in auth folder 
// make it (auth)