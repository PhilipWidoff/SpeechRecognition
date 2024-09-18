import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-blue-500 to-blue-600 bg-opacity-60 text-white  shadow-md z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-semibold hover:text-blue-100 transition-colors duration-200">
          Speech Recognition
        </Link>
        <div>
          <Link to="/" className="mr-4 hover:text-blue-100 transition-colors duration-200">Home</Link>
          <Link to="/about" className="hover:text-blue-100 transition-colors duration-200">About</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;