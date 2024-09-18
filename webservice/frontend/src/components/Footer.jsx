import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  const authors = ['Kandal', 'Leon', 'Marcus', 'Philip'];

  return (
    <footer className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 py-8 mt-auto bg-opacity-90">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-l font-bold mb-4">PROJECT CONTRIBUTORS</h3>
            <div className="flex flex-wrap gap-4">
              {authors.map((author, index) => (
                <span key={index} className="bg-gray-100 bg-opacity-30 px-3 py-1 rounded-full text-sm">
                  {author}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm">&copy; {currentYear} Speech Recognition</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;