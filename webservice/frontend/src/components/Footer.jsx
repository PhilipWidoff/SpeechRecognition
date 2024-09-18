import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  const authors = ['Kandal', 'Leon', 'Marcus', 'Philip'];

  return (
    <footer className="bg-gray-200 text-gray-800 py-6 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-semibold">Project Contributors</h3>
            <div className="flex flex-wrap justify-center md:justify-start mt-2">
              {authors.map((author, index) => (
                <span key={index} className="text-sm text-gray-600 mr-4 mb-2">{author}</span>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>&copy; {currentYear} Speech Recognition.</p>
            <p className="mt-1">Developed with passion and dedication.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;