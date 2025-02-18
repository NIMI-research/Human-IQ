"use client"
 
import Link from "next/link"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { ChevronRightCircle, ChevronLeftCircle } from "lucide-react"
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea";


const tools = {
  'Wikipedia Search': {
    api: 'search_relevant_article_and_summarize',
    backend: 'WikiSearch'
  },
  'Wikipedia Search Summary': {
    api: 'search_answer_from_article',
    backend: 'WikiSearchSummary'
  },
  'Get Wikidata ID': {
    api: 'get_wiki_id',
    backend: 'GetWikidataID'
  },
  'Generate Squall': {
    api: 'squall_tool',
    backend: 'GenerateSquall'
  },
  'Run Sparql Query': {
    api: 'run_sparql',
    backend: 'RunSparql'
  },
  'Get Label': {
    api: 'get_label_from_id',
    backend: 'GetLabel'
  }
};

const thoughtsSchema = z.object({
  thought: z
    .string()
    .min(3, {
      message: "Thought must be at least 3 characters.",
    }),
  action: z
    .string(),
  actionInput: z
    .string()
    .min(1, {
      message: "Enter atleast 1 characters",
    }),
  finalCheck: z.literal( false ),
})

const finalFormSchema = z.object({
  wikipedia: z
    .string()
    .min(1, {
      message: "Enter atleast 3 characters",
    }),
  wikidata: z
    .string()
    .min(1, {
      message: "Enter atleast 3 characters",
    }),
  finalThought: z
    .string()
    .min(3, {
      message: "Enter atleast 3 characters",
    }),
  finalCheck: z.literal( true ),
})

const formSchema = z.discriminatedUnion('finalCheck', [
  thoughtsSchema,
  finalFormSchema
])

export default function Thoughts({onFormSubmit, clearFormData, formData, questionIndex, incrementQuestionIndex}) {
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState(null);
  const [loadingState, setLoadingState] = useState('Loading question...');
  const params = useSearchParams();
  const questionId = params.get('id');

  const defaultValues = {
    thought: "",
    action: "",
    actionInput: "",
    wikidata: "",
    wikipedia: "",
    finalCheck: false
  }

  // 1. Define your form.
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues
  })

  // 2. Define a submit handler.
  const onSubmit = async(values) => {
    if (values.action === 'WikiSearch' || values.action === 'GenerateSquall' || values.action === 'WikiSearchSummary' ) {
      values.actionInput = question.question + '#' + values.actionInput;
    }

    console.log(values);
    
    const currentFormData = {
      question: question.question,
      dataset: question.dataset,
      ...values,
      showFeedback: true
    }

    // Submit entire form data to db if this check is enabled
    if (form.getValues('finalCheck')) {
      const finalPayload = [...formData, values]
      console.log(finalPayload);
      setLoading(true);
      console.log(question);
      try {
        const { data, error } = await supabase
          .from("thoughts_responses")
          .insert([
            {
              question: question.question,
              dataset: question.dataset,
              data: finalPayload,
            },
          ])
          .single();

        const {quesData, quesError} = await supabase
          .from("ques")
          .update({ isused: true})
          .eq('id', question.id)

        setLoading(false);
        // Resetting global form data (observations)
        clearFormData();

        // Moving to next question after success
        getQuestion();
        incrementQuestionIndex();
        if (error) throw error;
      } catch (error) {
        setLoading(false);
        console.log(error);
      }
    } else {
      //Appending to main form data
      setLoading(true);
      // let hostname = 'http://3.78.218.18:8000';
      let hostname = 'https://api.hybridqatool.com/fetch_observation';
      let endpoint = '/generate_squall';
      if (values.action === 'GenerateSquall') {
        endpoint = '/generate_squall'
      }
      if (values.action === 'WikiSearch') {
        endpoint = '/wiki_search'
      }
      if (values.action === 'WikiSearchSummary') {
        endpoint = '/wiki_search_summary'
      }
      if (values.action === 'GetWikidataID') {
        endpoint = '/get_wikidata_id'
      }
      if (values.action === 'RunSparql') {
        endpoint = '/run_sparql'
      }
      if (values.action === 'GetLabel') {
        endpoint = '/get_label'
      }
      try {
        const response = await fetch(hostname, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'accept' : 'application/json'
          },
          body: JSON.stringify({
            "action": values.action,
            "action_input": values.actionInput
          })
        });
        if (response.ok) {
          const responseData = await response.json();
          console.log('Form data submitted successfully');
          currentFormData.response = responseData.message ? responseData.message : JSON.stringify(responseData);
          onFormSubmit(currentFormData);
          setLoading(false);
        } else {
          console.log('api failed');
          console.log(response);
          throw new Error('Failed to submit form data');
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
        console.log(error);
      }
    }
    resetFormFields();
  }

  function resetFormFields() {
    // Resetting current form data
    form.reset(defaultValues);
  }

  // Get question from DB
  const getQuestion = async (id) => {
    console.log(id);
    let data = null, error = null;
    try {
      if (id) {
        console.log('in here');
        ({ data, error } = await supabase
          .from('thoughts_responses')
          .select('*')
          .eq('id', id)
          .limit(1));
        if (error) {
          throw error;
        }  
      } else {
        ({ data, error } = await supabase
          .from('random_ques')
          .select('*')
          .eq('isused', false)
          .limit(1));
        if (error) {
          throw error;
        }
      }
      
      console.log(data);
      if (data.length === 0) {
        // Handle case when no questions are available
        setQuestion(null);
        setLoadingState('Looks like we have exhausted all our questions. We appretiate your valuable time!')
      }
      setQuestion(data[0]);
      // setQuestion({question: 'Which official languages of the European Union do not use the Latin script?', id: '123', dataset: 'asa'})
    } catch (error) {
      console.log(error);
    }
  };


  function handleNextQuestionClick() {
    getQuestion();
    resetFormFields();

    // Resetting global form data (observations)
    clearFormData();

    incrementQuestionIndex();
  }

  const isSubmitDisabled = !form.watch('finalCheck') && (form.watch('action').length === 0);

  useEffect(() => {
    form.reset(defaultValues);
    form.resetField("action");
  }, [form.formState.isSubmitSuccessful])

  useEffect(() => {
    getQuestion(questionId);
    console.log(question);
    console.log('fetching question from the db');
  }, []);

  return (
    <div className="w-full max-h-[90%] min-h-[90%] overflow-auto rounded-xl border bg-card text-card-foreground shadow p-10">
      <div className="flex flex-row justify-between">
        { questionId ?
          <h3 className="text-xl font-bold pb-2">Question #{questionId}</h3>
          :
          <h3 className="text-xl font-bold pb-2">Question #{questionIndex+1} / 15 <p className="text-xs font-normal opacity-50">Please answer atleast 15 unique questions</p></h3>
        }
        {!questionId && <div className="flex flex-row space-x-2">
          <span className={!question ? 'opacity-20': 'cursor-pointer hover:opacity-80'}>
            {(!form.formState.isDirty && formData.length === 0) ? 
              <ChevronRightCircle onClick={handleNextQuestionClick} disabled={!question}/> :
              <AlertDialog>
                <AlertDialogTrigger><ChevronRightCircle/></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will loose any progress made in this question.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleNextQuestionClick}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            }
          </span>
        </div>
        }
      </div>
      {!question ? 
      <>
        <h2 className="text-md mt-4 mb-10">{loadingState}</h2>
      </>
      :
      <>
        <h2 className="text-md mt-4 mb-10">{question && question.question}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {!form.watch('finalCheck') ?
              <>
                <FormField
                  control={form.control}
                  name="thought"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row space-x-2 items-center justify-between">
                        <FormLabel>Thought</FormLabel>
                        <FormMessage />
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Type your thought here"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Come up with a thought before choosing the tool
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row space-x-2 items-center justify-between">
                        <FormLabel>Choose your action</FormLabel>
                        <FormMessage />
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a tool for your action" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(tools).map(([toolName, toolValue]) => (
                            <SelectItem key={toolValue.backend} value={toolValue.backend}>
                              {toolName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actionInput"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row space-x-2 items-center justify-between">
                        <FormLabel>Input for your action</FormLabel>
                        <FormMessage />
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Type your action input here"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </> :
              <>
              <FormField
                control={form.control}
                name="wikipedia"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row space-x-2 items-center justify-between">
                      <FormLabel>Wikipedia Answer</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Type your Wikipedia answer here"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wikidata"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row space-x-2 items-center justify-between">
                      <FormLabel>Wikidata Answer</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Type your Wikidata answer here"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="finalThought"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row space-x-2 items-center justify-between">
                      <FormLabel>Final Thought</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Type your thought here"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Choose one among wikidata and wikipedia answer and explain your thoughts
                    </FormDescription>
                  </FormItem>
                )}
              />
              </>
            }
            <div className="space-y-0.5">
              <FormField
                control={form.control}
                name="finalCheck"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">
                        Submit final answer
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Enable this only if you find the answer
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isSubmitDisabled || loading}>{
              loading ? 
              <span className="flex flex-row">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
              :
              <span>Submit</span>
            }</Button>
          </form>
        </Form>
      </>}
    </div>
  )
}