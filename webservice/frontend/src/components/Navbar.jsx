import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-medium">Speech Recognition</Link>
        <div>
          <Link to="/" className="mr-4 hover:underline">Home</Link>
          <Link to="/about" className="hover:underline">About</Link>
        </div>
      </div>
    </nav>
  );
}
export default Navbar;