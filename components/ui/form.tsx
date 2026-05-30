import * as React from "react"
import {
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  Controller,
  FormProvider,
} from "react-hook-form"
import { cn } from "@/lib/utils"

type FormProps<TFormValues extends FieldValues> = UseFormReturn<TFormValues> & {
  children: React.ReactNode
}

type FormFieldContextValue = {
  error?: { message?: string }
}

const FormFieldContext = React.createContext<FormFieldContextValue>({})

export function Form<TFormValues extends FieldValues>({ children, ...form }: FormProps<TFormValues>) {
  return <FormProvider {...form}>{children}</FormProvider>
}

type FormFieldProps<
  TFormValues extends FieldValues,
  TName extends FieldPath<TFormValues>
> = {
  control: Control<TFormValues>
  name: TName
  render: (props: {
    field: ControllerRenderProps<TFormValues, TName>
    fieldState: ControllerFieldState
  }) => React.ReactNode
}

export function FormField<
  TFormValues extends FieldValues,
  TName extends FieldPath<TFormValues>
>({ control, name, render }: FormFieldProps<TFormValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldContext.Provider value={{ error: fieldState.error }}>
          {render({ field, fieldState })}
        </FormFieldContext.Provider>
      )}
    />
  )
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
)
FormItem.displayName = "FormItem"

export const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
)
FormLabel.displayName = "FormLabel"

export const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />,
)
FormControl.displayName = "FormControl"

export const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error } = React.useContext(FormFieldContext)

    if (!error?.message && !children) {
      return null
    }

    return (
      <p ref={ref} className={cn("text-sm text-destructive", className)} {...props}>
        {children ?? error?.message}
      </p>
    )
  },
)
FormMessage.displayName = "FormMessage"
