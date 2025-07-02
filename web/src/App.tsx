import { useState } from 'react'
import './App.css'
import PlayerInfo from './PlayerInfo'
function App() {
  const [name, setName] = useState<string>("")
  const [show, setShow] = useState<boolean>(false)
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
      <header className=''>
        <div className="border border-red-500 w-screen flex justify-between items-center">
          <div className="flex">
          <img 
            src="/img/bslogo.png"
            className="h-48 w-48 object-contain border border-red-50"
          />
          </div>
          <h1 className='font-Oswald text-center'>
            Brawl Analytics
          </h1>
          <div className="w-48"></div>
        </div>
      </header>
      <div>

        <label>Enter your name: </label>
        <input type="text" 
        name="playerid" 
        placeholder='PlayerID'
        onChange={onChangeHandler}
        onKeyDown={onEnter}
        value={name}></input>
      </div>
      <PlayerInfo playerID={name} show={show}></PlayerInfo>

      
    </>
  )
}

export default App
