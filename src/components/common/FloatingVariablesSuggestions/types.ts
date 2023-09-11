export interface SuggestionType {
    variableName: string
    description: string
    variableValue: {
        value: string
    }
}

export interface FloatingVariablesSuggestionsProps {
    zIndex: number
    loading: boolean
    variables: SuggestionType[]
    reloadVariables: () => void
    error: boolean
}

export interface SuggestionsItemProps {
    variableName: string
    description: string
    variableValue: string
}

export interface SuggestionsProps {
    handleDeActivation: (e: React.MouseEvent<HTMLOrSVGElement>) => void
    loading: boolean
    variables: SuggestionType[]
    reloadVariables: () => void
    error: boolean
}
