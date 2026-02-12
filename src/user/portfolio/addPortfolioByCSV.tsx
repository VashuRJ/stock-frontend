import React from 'react'

export const AddPortfolioByCSV = () => {



    
    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">Add Portfolio by CSV</h2>
            <p className="text-gray-300 mb-6">Upload a CSV file to add multiple holdings to your portfolio at once. The CSV file should have the following columns: Symbol, Stock Name, Quantity, Avg Buy Price.</p>
            <form>
                <div className="mb-4">
                    <input type="file"
                        accept=".csv" 
                        className="w-full text-gray-300 bg-[#2b3648] border border-gray-600 rounded-lg p-2" 
                        placeholder='Enter your file'
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                    Upload CSV
                </button>
            </form>
        </div>
    )
}
