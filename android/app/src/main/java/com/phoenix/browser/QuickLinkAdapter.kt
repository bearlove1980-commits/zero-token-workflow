package com.phoenix.browser

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class QuickLinkAdapter(
    private val items: List<QuickLink>,
    private val onClick: (QuickLink) -> Unit
) : RecyclerView.Adapter<QuickLinkAdapter.VH>() {

    private val colors = listOf(
        "#E53935", "#8E24AA", "#1E88E5", "#00897B",
        "#F4511E", "#6D4C41", "#039BE5", "#43A047",
        "#FB8C00", "#757575"
    )

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        val circle: View      = view.findViewById(R.id.quickLinkCircle2)
        val initial: TextView = view.findViewById(R.id.quickLinkInitial)
        val title: TextView   = view.findViewById(R.id.quickLinkTitle)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_quick_link, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.initial.text = item.initial
        holder.title.text   = item.title
        try {
            holder.circle.backgroundTintList =
                android.content.res.ColorStateList.valueOf(
                    Color.parseColor(colors[position % colors.size])
                )
        } catch (_: Exception) { }
        holder.itemView.setOnClickListener { onClick(item) }
    }
}
