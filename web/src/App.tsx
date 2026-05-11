import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import './App.css';

function App() {
  const [name, setName] = useState<string>('');
  const navigate = useNavigate();

  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onEnter = (enter: React.KeyboardEvent<HTMLInputElement>) => {
    if (enter.key === 'Enter') {
      enter.preventDefault();
      const tag = name.trim().replace(/^#/, '').toUpperCase();
      if (tag.length === 0) return;
      navigate(`/player/${tag}`);
    }
  };

  return (
    <>
      <title>Brawl Analytics</title>

      <div className='flex flex-col min-h-[75vh] justify-center items-center'>
        <h2 className='p-4 text-zinc-300 text-lg font-medium tracking-wide'>
          <TypeAnimation
            sequence={['Enter your ID']}
            speed={50}
            cursor={true}
            repeat={0}
          />
        </h2>
        <input
          className='w-72 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors'
          type='text'
          name='playerid'
          placeholder='#PLAYERTAG'
          onChange={onChangeHandler}
          onKeyDown={onEnter}
          value={name}
        />
      </div>
    </>
  );
}

export default App;
