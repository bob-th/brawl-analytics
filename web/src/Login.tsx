import { useState } from "react";
const Login = () =>
{
    
    type FormInputs = {
        username: string;
        password: string;
    };

    // Initialize state with TypeScript type
    const [userinfo, setInfo] = useState<FormInputs>({
        username: '',
        password: ''
    });

    // Handle input changes with proper typing
    const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo(prev => ({
        ...prev,
        [name]: value
        }));
        console.log("surprise", {userinfo});

    };

    // Handle form submission
    const onSubmitHandler = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt with:', userinfo);
        // Add your authentication logic here
    };

   
    return (
    <>
    <div className="min-h-[75vh] items-center justify-center flex flex-col">
        <div>
                    <h1 className="p-4 text-white font-hello font-medium">
                        Login:
                    </h1>
        </div>

        
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm mb-3">
            <form action="#" method="POST" className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm/6 font-medium font-hello">
                        Email address
                    </label>
                    <input 
                        className='block w-full px-3 py-1.5 rounded-md bg-gray-800 sm:text-sm/6'
                        type="email" 
                        name="username" 
                        required
                        onChange={onChangeHandler}

                        value={userinfo.username}>

                    </input>
                </div>
                <div className="mb-12">
                <div className = "">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm/6 font-medium font-hello">
                        Password
                        </label>
                        <div className="text-sm">
                            <p className="font-hello text-white hover:underline">
                                Forgot password?
                            </p>
                        </div>
                    </div>
                </div>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    onChange={onChangeHandler}
                    autoComplete="current-password"
                    className="block w-full px-3 py-1.5 rounded-md bg-gray-800 sm:text-sm/6"
                />
                </div>
                <div>
                    <button
                    type="submit"
                    className="flex w-full bg-nice_purple justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 "
                    onSubmit={onSubmitHandler}
                    >
                    Sign in
                    </button>
                </div>
                
            </form>
        </div>

        <div className="flex justify-left min-w-3.5 text-purple-400/20">
            <button type="button" className="px-12 hover:underline">
              Don't have an Account? sign up
            </button>
        </div>
    </div>
    </>
    )
}
export default Login
