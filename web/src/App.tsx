import { useState } from 'react'
import './App.css'
import PlayerInfo from './components/player/PlayerInfo.tsx'

function App() {
  const [name, setName] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  
  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  const onEnter = (enter: React.KeyboardEvent<HTMLInputElement>) => {
    if(enter.key == "Enter"){
      enter.preventDefault()
      setShow(true)
    }
    
  }
  
  return (
    <>
      <title>Brawl Analytics</title>
      

      <div className='flex flex-col min-h-[75vh] justify-center items-center'>
        
        <h1 className='p-4 text-white font-hello font-medium'>Enter your ID.</h1>
        <br />
        <input 
        className='w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        type="text" 
        name="playerid" 
        placeholder='#'
        onChange={onChangeHandler}
        onKeyDown={onEnter}
        value={name}></input>
      </div>
  
      <PlayerInfo playerID={name} show={show}></PlayerInfo>

      
    </>
  )
}

export default App;
