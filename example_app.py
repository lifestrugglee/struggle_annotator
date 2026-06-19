import streamlit as st
from struggle_annotator import txt_annotator

text = (
    "Yesterday, at 3 PM, Emily Johnson and Michael Smith met at the Central Park "
    "in New York to discuss the merger between TechCorp and Global Solutions.\n\n"
    "The deal, worth approximately 500 million dollars, is expected to "
    "significantly impact the tech industry. Later, at 6 PM, they joined a "
    "conference call with the CEO of TechCorp, David Brown, who was in London "
    "for a technology summit. During the call, they discussed the market trends "
    "in Asia and Europe and planned for the next quarterly meeting, which is "
    "scheduled for January 15th, 2024, in Paris."
    "\n\n\n\nThe deal, worth approximately 500 million dollars, is expected to "
    "significantly impact the tech industry. Later, at 6 PM, they joined a "
    "conference call with the CEO of TechCorp, David Brown, who was in London "
    "for a technology summit. During the call, they discussed the market trends "
    "in Asia and Europe and planned for the next quarterly meeting, which is "
    "scheduled for January 15th, 2024, in Paris."
)

label_dict = {
    "Names": {"color": "#FE4545"},
    "Geographic subdivisions": {"color": "#008000"},
    "Dates": {"color": "#FFA500"},
    "Telephone numbers": {"color": "#4F4FFF"},
    "Fax numbers": {"color": "#33D0D0"},
    "Email addresses": {"color": "#FF00FF"},
    "Social Security numbers": {"color": "#800080"},
    "Medical record numbers": {"color": "#A65353"},
    "Health plan beneficiary numbers": {"color": "#FF889C"},
    "Account numbers": {"color": "#C4A600"},
    "Certificate/license numbers": {"color": "#008080"},
    "Vehicle identifiers": {"color": "#353590"},
    "Device identifiers": {"color": "#76D076"},
    "Web URLs": {"color": "#800000"},
    "IP addresses": {"color": "#8E8E3A"},
    # "Biometric identifiers": {"color": "#FF7F50"},
    # "Full-face photographs": {"color": "#808080"},
    "Other unique identifying numbers": {"color": "#8A8A8A"},
}

st.title("Struggle Annotator")
with st.expander("Setting", expanded=True):
    col1, col2, col3 = st.columns([1.5, 1.6, 1.5], vertical_alignment="center")
    with col1:
        auto_expand = st.toggle("Auto-expand to full word", value=True, key="auto_expand")
    with col2:
        spacing_val = st.slider("Line spacing", min_value=1.2, max_value=5.0, value=1.9, step=0.1, key="spacing")
    with col3:
        label_position = st.selectbox("Label position", options=["top", "left", "right"], index=0, key="label_position")


result = txt_annotator(text, label_dict, label_position=label_position, spacing=spacing_val, auto_expand=auto_expand, key="annotator")
st.json(result)
