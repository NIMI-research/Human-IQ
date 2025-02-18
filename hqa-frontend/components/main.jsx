"use client"

import Thoughts from "@/components/thoughts";
import Observations from "@/components/observations";
import { useState } from 'react';

export default function Main() {
  const [formData, setFormData] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const handleFormSubmit = (newData) => {
    setFormData((prevData) => [...prevData, newData]);
  }

  const updateFormData = (newData) => {
    setFormData(newData);
  }

  const incrementQuestionIndex = () => {
    setQuestionIndex((prevIndex) => prevIndex + 1);
  }

  return (
    <div className="flex w-auto h-full justify-center">
      <div className="flex flex-col w-2/5 h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <Thoughts 
            onFormSubmit={handleFormSubmit} 
            clearFormData={() => setFormData([])} 
            formData={formData} 
            questionIndex={questionIndex} 
            incrementQuestionIndex={() =>incrementQuestionIndex()}
            />
        </div>
      </div>
      <div className="flex flex-col w-2/5 h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <Observations 
            data={formData} 
            updateFormData={updateFormData} 
            questionIndex={questionIndex} 
            incrementQuestionIndex={() =>incrementQuestionIndex()}
            />
        </div>
      </div>
    </div>
  )
}