"use client"

import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react"
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";

export default function Observations({ data, updateFormData }) {
  const containerRef = useRef(null);
  const handleRatingClick = async(item, response, index) => {
    try {
      const { data, error } = await supabase
          .from("feedback")
          .insert([
            {
              question: item.question,
              dataset: item.dataset,
              data: item,
              response: (response === 'yes' ? true: false)
            },
          ])
          .single();
        if (error) throw error;
      } catch (error) {
        console.log(error);
      }
    
    const updatedData = [...data];

    updatedData[index] = {
      ...updatedData[index],
      showFeedback: false    
    }
    updateFormData(updatedData);
  }

  const formatedResponse = (item) => {
    console.log(item);
    let formatted = null;
    if (item.action === 'RunSparql') {
      const responses = item.response;
      //SELECT DISTINCT ?x1 WHERE { wd:Q85 p:P1082 ?x2 . ?x2 ps:P1082 ?x1 . }
      return (
        <div className="break-words">
          {Array.isArray(responses) ? (
            responses.map((response, index) => (
              <div key={index}>{JSON.stringify(response)}</div>
            ))
          ) : (
            responses
          )}
        </div>
      )
      
    } else {
      formatted = typeof item.response === 'string' ? item.response.replace(/\n/g, "<br/>") : item.response;
      return <div dangerouslySetInnerHTML={{ __html: formatted }}></div>;
    }
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [data]);

  return (
    <div className="w-full max-h-[90%] min-h-[90%] rounded-xl border bg-card text-card-foreground shadow p-10 overflow-auto" ref={containerRef}>
      <h3 className="text-xl font-bold pb-2">History</h3>
      {data.length > 0 ? (
        <div>
          {data.map((item, index) => (
            <div key={index}>
              <h3 className="text-sm font-medium pt-4 pb-2">Thought #{index+1}</h3>
              <div className="font-mono bg-slate-100 p-3 text-sm rounded-lg mb-2">
                {item.thought}
              </div>
              <h3 className="text-sm font-medium pt-4 pb-2">Action</h3>
              <div className="font-mono bg-slate-100 p-3 text-sm rounded-lg mb-2">
                {item.action}
              </div>
              <h3 className="text-sm font-medium pt-4 pb-2">Action Input</h3>
              <div className="font-mono bg-slate-100 p-3 text-sm rounded-lg mb-2">
                {item.actionInput}
              </div>
              <h3 className="text-sm font-medium pt-4 pb-2">Observation</h3>
              <div className="flex flex-col">
              <div className="font-mono bg-slate-100 p-3 text-sm rounded-lg mb-2">
                {formatedResponse(item)}
              </div>
                {item.showFeedback ? (
                  <div className="flex flex-row space-x-2 items-center">
                    <p className="text-sm">Was this observations helpful?</p>
                    <div className="flex flex-row space-x-2">
                      <ThumbsUpIcon
                          onClick={() => {
                            handleRatingClick(item, "yes", index);
                          }}
                          className="cursor-pointer w-4"
                        />
                        <ThumbsDownIcon
                          onClick={() => {
                            handleRatingClick(item, "no", index);
                          }}
                          className="cursor-pointer w-4"
                        />
                    </div>
                  </div>
                ): (
                  <p className="text-sm opacity-50">Thanks for your feedback!</p>
                )}
              </div>
              {(data.length > 1) && (data.length !== index+1) ? <hr className="mt-8 mb-4"/> : ''}
            </div>
          ))}
        </div>
      ) : <p className="font-sm opacity-50">All your submission responses will be here</p>}
    </div>
  )
}