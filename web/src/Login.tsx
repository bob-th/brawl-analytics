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
    };

    // Handle form submission
    const onSubmitHandler = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt with:', userinfo);
        // Add your authentication logic here
    };

   
    return (

    <div className="min-h-[75vh] items-center flex flex-col">
        <div>
                    <h1 className="p-4 text-white font-hello font-medium">
                        Login:
                    </h1>
        </div>

        
        <div className="flex justify-center items-center mb-4">
            <form action="#" method="POST" className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                        Email address
                    </label>
                    <input 
                        className='w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                        type="email" 
                        name="playerid" 
                        required
                        onChange={onChangeHandler}

                        value={userinfo.username}>

                    </input>
                </div>
                <div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                        Password
                        </label>
                        <div className="text-sm">
                            <p className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Forgot password?
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-2">
                    <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                </div>
                
            </form>
        </div>

        <div className="flex justify-between">
            <button type="button" className="px-12 hover:underline">
              sign up?
            </button>
            <button type="button" className="px-12 hover:underline">
              forgot password?
            </button>
        </div>
    </div>
    )
}
export default Login
